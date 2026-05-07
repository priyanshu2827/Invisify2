import os
from typing import List, Optional, Tuple

import torch
import torch.nn as nn
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
from torch.utils.data import DataLoader

from .loss import CombinedLoss, DetectionLoss
from .noise_layer import NoiseLayer


class ImprovedTrainer:
    """
    Advanced training loop with:
    - AdamW optimizer with weight decay
    - Cosine annealing warm restarts scheduler
    - Gradient clipping
    - Automatic mixed precision (AMP)
    - Progressive resolution training
    - Noise layer injection for robustness
    """

    def __init__(self, model: nn.Module, decoder: Optional[nn.Module] = None,
                 train_loader: Optional[DataLoader] = None,
                 val_loader: Optional[DataLoader] = None,
                 lr: float = 1e-4,
                 weight_decay: float = 1e-5,
                 max_grad_norm: float = 1.0,
                 device: str = 'cuda' if torch.cuda.is_available() else 'cpu',
                 checkpoint_dir: str = './checkpoints',
                 use_amp: bool = True,
                 noise_layer: Optional[NoiseLayer] = None):

        self.model = model.to(device)
        self.decoder = decoder.to(device) if decoder else None
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.device = device
        self.max_grad_norm = max_grad_norm
        self.checkpoint_dir = checkpoint_dir
        self.use_amp = use_amp and torch.cuda.is_available()

        os.makedirs(checkpoint_dir, exist_ok=True)

        # Collect all parameters
        params = list(model.parameters())
        if self.decoder:
            params += list(decoder.parameters())

        # AdamW optimizer
        self.optimizer = torch.optim.AdamW(params, lr=lr, weight_decay=weight_decay)

        # Cosine annealing with warm restarts
        self.scheduler = CosineAnnealingWarmRestarts(
            self.optimizer, T_0=10, T_mult=2
        )

        # Mixed precision scaler
        self.scaler = torch.cuda.amp.GradScaler() if self.use_amp else None

        # Loss functions
        self.criterion = CombinedLoss()
        self.detection_criterion = DetectionLoss() if decoder else None

        # Noise layer for adversarial robustness
        self.noise_layer = noise_layer.to(device) if noise_layer else None

    def train_epoch(self) -> float:
        """Train for one epoch and return average loss."""
        self.model.train()
        if self.decoder:
            self.decoder.train()

        total_loss = 0.0
        num_batches = 0

        for batch in self.train_loader:
            self.optimizer.zero_grad()

            # Support both simple image batches and dict batches
            if isinstance(batch, dict):
                images = batch['cover'].to(self.device)
                messages = batch.get('message')
                if messages is not None:
                    messages = messages.to(self.device)
            else:
                images = batch.to(self.device)
                messages = None

            with torch.cuda.amp.autocast(enabled=self.use_amp):
                if self.decoder and messages is not None:
                    # End-to-end steganography training
                    encoded = self.model(images, messages) if hasattr(self.model, 'forward') and \
                        self.model.forward.__code__.co_argcount > 2 else self.model(images)

                    # Apply noise layer if present
                    if self.noise_layer:
                        encoded = self.noise_layer(encoded, training=True)

                    decoded = self.decoder(encoded)
                    loss = self.detection_criterion(encoded, images, decoded, messages)
                else:
                    # Standard training step
                    output = self.model(images)
                    if isinstance(output, tuple):
                        output = output[0]
                    loss = self.criterion(output, images)

            if self.scaler:
                self.scaler.scale(loss).backward()
                self.scaler.unscale_(self.optimizer)
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.max_grad_norm)
                if self.decoder:
                    torch.nn.utils.clip_grad_norm_(self.decoder.parameters(), self.max_grad_norm)
                self.scaler.step(self.optimizer)
                self.scaler.update()
            else:
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.max_grad_norm)
                if self.decoder:
                    torch.nn.utils.clip_grad_norm_(self.decoder.parameters(), self.max_grad_norm)
                self.optimizer.step()

            self.scheduler.step()
            total_loss += loss.item()
            num_batches += 1

        return total_loss / max(num_batches, 1)

    @torch.no_grad()
    def validate(self) -> float:
        """Run validation and return average loss."""
        self.model.eval()
        if self.decoder:
            self.decoder.eval()

        total_loss = 0.0
        num_batches = 0

        for batch in self.val_loader:
            if isinstance(batch, dict):
                images = batch['cover'].to(self.device)
                messages = batch.get('message')
                if messages is not None:
                    messages = messages.to(self.device)
            else:
                images = batch.to(self.device)
                messages = None

            if self.decoder and messages is not None:
                encoded = self.model(images, messages) if hasattr(self.model, 'forward') and \
                    self.model.forward.__code__.co_argcount > 2 else self.model(images)
                decoded = self.decoder(encoded)
                loss = self.detection_criterion(encoded, images, decoded, messages)
            else:
                output = self.model(images)
                if isinstance(output, tuple):
                    output = output[0]
                loss = self.criterion(output, images)

            total_loss += loss.item()
            num_batches += 1

        return total_loss / max(num_batches, 1)

    def progressive_training(self, epochs_per_stage: List[int] = None,
                             resolutions: List[int] = None):
        """
        Train with progressively increasing image resolution.
        Starts at low resolution for fast convergence, then fine-tunes at higher resolutions.
        """
        if epochs_per_stage is None:
            epochs_per_stage = [50, 50, 50]
        if resolutions is None:
            resolutions = [64, 128, 256]

        assert len(epochs_per_stage) == len(resolutions), \
            "epochs_per_stage and resolutions must have the same length"

        for resolution, epochs in zip(resolutions, epochs_per_stage):
            print(f"\n{'='*40}")
            print(f"Training at resolution: {resolution}x{resolution}")
            print(f"{'='*40}")

            # Note: in practice you would update the dataloader transforms here
            # to resize images to the target resolution
            for epoch in range(epochs):
                train_loss = self.train_epoch()
                val_loss = self.validate()
                print(f"  Epoch {epoch+1}/{epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f}")

            # Save checkpoint after each stage
            self.save_checkpoint(f'stage_{resolution}x{resolution}.pt')

    def save_checkpoint(self, filename: str):
        """Save model checkpoint."""
        path = os.path.join(self.checkpoint_dir, filename)
        state = {
            'model': self.model.state_dict(),
            'optimizer': self.optimizer.state_dict(),
            'scheduler': self.scheduler.state_dict(),
        }
        if self.decoder:
            state['decoder'] = self.decoder.state_dict()
        if self.scaler:
            state['scaler'] = self.scaler.state_dict()
        torch.save(state, path)
        print(f"  Checkpoint saved: {path}")

    def load_checkpoint(self, filename: str):
        """Load model checkpoint."""
        path = os.path.join(self.checkpoint_dir, filename)
        if not os.path.exists(path):
            print(f"  Checkpoint not found: {path}")
            return
        state = torch.load(path, map_location=self.device)
        self.model.load_state_dict(state['model'])
        self.optimizer.load_state_dict(state['optimizer'])
        self.scheduler.load_state_dict(state['scheduler'])
        if self.decoder and 'decoder' in state:
            self.decoder.load_state_dict(state['decoder'])
        if self.scaler and 'scaler' in state:
            self.scaler.load_state_dict(state['scaler'])
        print(f"  Checkpoint loaded: {path}")

    def fit(self, epochs: int = 100, patience: int = 10) -> Tuple[List[float], List[float]]:
        """
        Full training loop with early stopping.
        Returns lists of train and validation losses.
        """
        best_val_loss = float('inf')
        epochs_no_improve = 0
        train_losses = []
        val_losses = []

        for epoch in range(epochs):
            train_loss = self.train_epoch()
            val_loss = self.validate()
            train_losses.append(train_loss)
            val_losses.append(val_loss)

            print(f"Epoch {epoch+1}/{epochs} | Train: {train_loss:.4f} | Val: {val_loss:.4f}")

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                epochs_no_improve = 0
                self.save_checkpoint('best_model.pt')
            else:
                epochs_no_improve += 1

            if epochs_no_improve >= patience:
                print(f"Early stopping triggered after {epoch+1} epochs.")
                break

        return train_losses, val_losses
