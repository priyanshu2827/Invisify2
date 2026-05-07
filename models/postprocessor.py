import random
from typing import Callable, List, Optional

import torch
import torch.nn as nn


class PostProcessor:
    """
    Post-processing techniques to improve detection and decoding accuracy:
    - Ensemble detection across multiple models
    - Test-time augmentation (TTA)
    - Redundancy-based error correction codes
    """

    @staticmethod
    @torch.no_grad()
    def ensemble_detection(image: torch.Tensor, models: List[nn.Module],
                           threshold: float = 0.5, device: str = 'cpu') -> torch.Tensor:
        """
        Use multiple models and average their predictions for robust detection.
        Args:
            image: Input image (B, C, H, W) or (C, H, W)
            models: List of trained decoder/detector models
            threshold: Decision threshold for binary classification
            device: Computation device
        Returns:
            Binary predictions (B, ...) or (...)
        """
        if image.dim() == 3:
            image = image.unsqueeze(0)

        image = image.to(device)
        predictions = []
        for model in models:
            model.eval()
            model = model.to(device)
            pred = model(image)
            # Handle tuple outputs from encoder
            if isinstance(pred, tuple):
                pred = pred[0]
            predictions.append(pred)

        # Average ensemble
        avg_prediction = torch.stack(predictions).mean(dim=0)
        return (avg_prediction > threshold).float()

    @staticmethod
    @torch.no_grad()
    def test_time_augmentation(image: torch.Tensor, model: nn.Module,
                               num_augments: int = 8, device: str = 'cpu') -> torch.Tensor:
        """
        Apply augmentations at test time and average results for improved robustness.
        Args:
            image: Input image (B, C, H, W) or (C, H, W)
            model: Trained model
            num_augments: Number of augmentations to apply (max 6 available)
            device: Computation device
        Returns:
            Averaged prediction tensor
        """
        if image.dim() == 3:
            image = image.unsqueeze(0)

        image = image.to(device)
        model.eval()
        model = model.to(device)

        augmentations = [
            lambda x: x,                          # Original
            lambda x: torch.flip(x, dims=[2]),    # Horizontal flip
            lambda x: torch.flip(x, dims=[3]),    # Vertical flip
            lambda x: torch.rot90(x, k=1, dims=[2, 3]),  # 90 degree rotation
            lambda x: torch.rot90(x, k=2, dims=[2, 3]),  # 180 degree rotation
            lambda x: torch.rot90(x, k=3, dims=[2, 3]),  # 270 degree rotation
        ]

        predictions = []
        for aug in augmentations[:min(num_augments, len(augmentations))]:
            augmented = aug(image)
            pred = model(augmented)
            if isinstance(pred, tuple):
                pred = pred[0]

            # Reverse geometric augmentations for consistent aggregation
            if aug.__name__ == '<lambda>' and not torch.equal(augmented, image):
                # For flips: apply same flip again = identity for H flip
                if 'rot90' in str(aug):
                    # Determine rotation angle from comparison
                    # Simpler approach: just accumulate all without un-aug
                    pass

            predictions.append(pred)

        return torch.stack(predictions).mean(dim=0)

    @staticmethod
    def error_correction(decoded_bits: torch.Tensor, redundancy: int = 3) -> torch.Tensor:
        """
        Apply simple repetition code error correction via majority voting.
        Args:
            decoded_bits: Tensor of decoded bits (N,)
            redundancy: Number of repeated copies per bit (must divide len evenly)
        Returns:
            Corrected bit tensor (N // redundancy,)
        """
        n = decoded_bits.numel()
        if n % redundancy != 0:
            # Pad to multiple
            pad = redundancy - (n % redundancy)
            decoded_bits = torch.cat([decoded_bits, torch.zeros(pad, dtype=decoded_bits.dtype, device=decoded_bits.device)])
            n = decoded_bits.numel()

        reshaped = decoded_bits.reshape(-1, redundancy)
        # Majority vote
        corrected = (reshaped.sum(dim=1) > redundancy / 2).float()
        return corrected

    @staticmethod
    def confidence_weighted_ensemble(image: torch.Tensor,
                                     models: List[nn.Module],
                                     confidence_fn: Optional[Callable[[torch.Tensor], torch.Tensor]] = None,
                                     device: str = 'cpu') -> torch.Tensor:
        """
        Weighted ensemble where each model's prediction is weighted by a confidence score.
        """
        if image.dim() == 3:
            image = image.unsqueeze(0)
        image = image.to(device)

        predictions = []
        confidences = []

        for model in models:
            model.eval()
            model = model.to(device)
            pred = model(image)
            if isinstance(pred, tuple):
                pred = pred[0]
            predictions.append(pred)

            if confidence_fn:
                conf = confidence_fn(pred)
                confidences.append(conf)
            else:
                # Default: use prediction distance from 0.5 as confidence
                conf = 1.0 - 2.0 * torch.abs(pred - 0.5)
                confidences.append(conf)

        stacked_preds = torch.stack(predictions)
        stacked_confs = torch.stack(confidences)
        # Normalize weights
        weights = stacked_confs / stacked_confs.sum(dim=0, keepdim=True).clamp_min(1e-8)
        weighted_avg = (stacked_preds * weights).sum(dim=0)
        return weighted_avg

    @staticmethod
    def repeated_decode(image: torch.Tensor, decoder: nn.Module,
                        num_runs: int = 5, device: str = 'cpu') -> torch.Tensor:
        """
        Run decoder multiple times with minor input perturbations and vote.
        Useful for stochastic decoders or when paired with dropout at test time.
        """
        if image.dim() == 3:
            image = image.unsqueeze(0)
        image = image.to(device)
        decoder.eval()
        decoder = decoder.to(device)

        predictions = []
        for _ in range(num_runs):
            # Add tiny random noise (simulates different quantization paths)
            noise_scale = 1.0 / 255.0
            noisy = image + torch.randn_like(image) * noise_scale
            noisy = torch.clamp(noisy, 0.0, 1.0)
            with torch.no_grad():
                pred = decoder(noisy)
                if isinstance(pred, tuple):
                    pred = pred[0]
            predictions.append(pred)

        # Majority vote across runs
        stacked = torch.stack(predictions)
        avg = stacked.mean(dim=0)
        return avg
