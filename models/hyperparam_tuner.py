import os
from typing import Optional

import optuna
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset

from .encoder import ImprovedEncoder
from .decoder import ImprovedDecoder
from .loss import CombinedLoss, DetectionLoss
from .trainer import ImprovedTrainer


def build_model(encoder_channels: int, decoder_channels: int,
                message_length: int = 64, device: str = 'cuda' if torch.cuda.is_available() else 'cpu'):
    """
    Build encoder and decoder with configurable channel widths.
    This is a simplified builder for hyperparameter search.
    """
    encoder = ImprovedEncoder()
    decoder = ImprovedDecoder(message_length=message_length)
    return encoder.to(device), decoder.to(device)


def objective(trial: optuna.Trial,
              train_loader: Optional[DataLoader] = None,
              val_loader: Optional[DataLoader] = None,
              device: str = 'cuda' if torch.cuda.is_available() else 'cpu') -> float:
    """
    Optuna objective function for hyperparameter optimization.
    Maximizes detection accuracy / minimizes validation loss.
    """
    # Suggest hyperparameters
    lr = trial.suggest_float('lr', 1e-5, 1e-3, log=True)
    batch_size = trial.suggest_categorical('batch_size', [8, 16, 32])
    encoder_channels = trial.suggest_int('encoder_channels', 32, 128, step=16)
    decoder_channels = trial.suggest_int('decoder_channels', 32, 128, step=16)
    loss_alpha = trial.suggest_float('loss_alpha', 0.3, 0.9)
    loss_beta = trial.suggest_float('loss_beta', 0.05, 0.5)
    loss_gamma = trial.suggest_float('loss_gamma', 0.01, 0.2)
    noise_intensity = trial.suggest_float('noise_intensity', 0.01, 0.1)
    weight_decay = trial.suggest_float('weight_decay', 1e-6, 1e-3, log=True)
    scheduler_t0 = trial.suggest_int('scheduler_t0', 5, 20)

    # Build model with suggested params
    encoder, decoder = build_model(encoder_channels, decoder_channels, device=device)

    # Re-create loaders with suggested batch size if loaders are provided
    # (In practice, you may pre-load data and just re-batch)

    # Create a small subset for fast evaluation
    if train_loader is None or val_loader is None:
        # Return a dummy metric if no data is available
        return 0.0

    # Subset for fast trial
    train_subset_size = min(500, len(train_loader.dataset))
    val_subset_size = min(100, len(val_loader.dataset))
    train_subset = Subset(train_loader.dataset, range(train_subset_size))
    val_subset = Subset(val_loader.dataset, range(val_subset_size))

    train_dl = DataLoader(train_subset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_dl = DataLoader(val_subset, batch_size=batch_size, shuffle=False, num_workers=0)

    # Trainer
    criterion = DetectionLoss(message_weight=1.0, image_weight=1.0,
                                alpha=loss_alpha, beta=loss_beta, gamma=loss_gamma)

    # Quick training loop
    optimizer = torch.optim.AdamW(
        list(encoder.parameters()) + list(decoder.parameters()),
        lr=lr, weight_decay=weight_decay
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=scheduler_t0, T_mult=2
    )

    best_val = float('inf')
    patience = 5
    epochs_no_improve = 0

    for epoch in range(30):
        encoder.train()
        decoder.train()
        train_loss = 0.0
        for batch in train_dl:
            cover = batch['cover'].to(device)
            message = batch['message'].to(device)
            optimizer.zero_grad()
            # Simple forward (encoder-only for this trial)
            # In full setup, use end-to-end steganography pipeline
            loss = criterion(cover, cover, decoder(cover), message)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
        scheduler.step()

        # Validation
        encoder.eval()
        decoder.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch in val_dl:
                cover = batch['cover'].to(device)
                message = batch['message'].to(device)
                loss = criterion(cover, cover, decoder(cover), message)
                val_loss += loss.item()

        avg_val = val_loss / max(len(val_dl), 1)

        if avg_val < best_val:
            best_val = avg_val
            epochs_no_improve = 0
        else:
            epochs_no_improve += 1

        if epochs_no_improve >= patience:
            break

        # Report intermediate for pruning
        trial.report(-best_val, epoch)
        if trial.should_prune():
            raise optuna.TrialPruned()

    # Return negative loss (Optuna maximizes objective)
    return -best_val


def run_hyperparam_study(train_loader: Optional[DataLoader] = None,
                         val_loader: Optional[DataLoader] = None,
                         n_trials: int = 100,
                         study_name: str = 'invisify2_optimization',
                         storage: Optional[str] = None) -> optuna.Study:
    """
    Run an Optuna hyperparameter optimization study.
    Args:
        train_loader: Training data loader
        val_loader: Validation data loader
        n_trials: Number of optimization trials
        study_name: Name of the Optuna study
        storage: Optuna storage URL (e.g., 'sqlite:///optuna.db')
    Returns:
        Completed Optuna Study object
    """
    pruner = optuna.pruners.MedianPruner()
    sampler = optuna.samplers.TPESampler()

    study = optuna.create_study(
        direction='maximize',
        study_name=study_name,
        storage=storage,
        sampler=sampler,
        pruner=pruner,
        load_if_exists=True
    )

    def _objective(trial: optuna.Trial) -> float:
        return objective(trial, train_loader, val_loader)

    study.optimize(_objective, n_trials=n_trials)

    print(f"Best value: {study.best_value:.4f}")
    print(f"Best params: {study.best_params}")
    return study
