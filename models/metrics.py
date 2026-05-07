import math
from typing import Dict, List, Optional, Tuple, Callable

import numpy as np
import torch
import torch.nn.functional as F


class ComprehensiveMetrics:
    """
    Comprehensive evaluation metrics for steganography systems.
    Tracks image quality, message recovery accuracy, imperceptibility,
    and robustness under various real-world attacks.
    """

    @staticmethod
    def calculate_all(original: np.ndarray, encoded: np.ndarray,
                      decoded_message: Optional[np.ndarray] = None,
                      original_message: Optional[np.ndarray] = None) -> Dict[str, float]:
        """
        Calculate all standard metrics.
        Args:
            original: Original cover image (H, W, C) in [0, 255] or [0, 1]
            encoded: Encoded/stego image (H, W, C)
            decoded_message: Binary decoded message array
            original_message: Ground-truth binary message array
        Returns:
            Dictionary of metric names to values
        """
        metrics = {}

        # Ensure same scale
        if original.max() <= 1.0 and encoded.max() <= 1.0:
            original = (original * 255).astype(np.float32)
            encoded = (encoded * 255).astype(np.float32)

        # Image quality metrics
        metrics['PSNR'] = ComprehensiveMetrics.psnr(original, encoded)
        metrics['SSIM'] = ComprehensiveMetrics.ssim(original, encoded)
        metrics['MSE'] = float(np.mean((original.astype(np.float64) - encoded.astype(np.float64)) ** 2))

        # Message accuracy
        if decoded_message is not None and original_message is not None:
            metrics['BER'] = float(np.mean(decoded_message != original_message))
            metrics['Accuracy'] = 1.0 - metrics['BER']
            metrics['BitErrors'] = int(np.sum(decoded_message != original_message))

        # LPIPS-style perceptual distance (approximation using feature space)
        metrics['LPIPS_approx'] = ComprehensiveMetrics.lpips_approx(original, encoded)

        return metrics

    @staticmethod
    def psnr(img1: np.ndarray, img2: np.ndarray, max_val: float = 255.0) -> float:
        """Peak Signal-to-Noise Ratio."""
        mse = np.mean((img1.astype(np.float64) - img2.astype(np.float64)) ** 2)
        if mse == 0:
            return float('inf')
        return float(20 * math.log10(max_val / math.sqrt(mse)))

    @staticmethod
    def ssim(img1: np.ndarray, img2: np.ndarray, window_size: int = 11) -> float:
        """
        Lightweight SSIM approximation without skimage dependency.
        For exact SSIM, install scikit-image and use skimage.metrics.structural_similarity.
        """
        try:
            from skimage.metrics import structural_similarity
            if img1.ndim == 3 and img1.shape[2] == 3:
                return structural_similarity(img1, img2, multichannel=True, channel_axis=2, data_range=255.0)
            return structural_similarity(img1, img2, data_range=255.0)
        except ImportError:
            # Fallback: simple normalized cross-correlation approximation
            mu1 = np.mean(img1)
            mu2 = np.mean(img2)
            sigma1 = np.std(img1)
            sigma2 = np.std(img2)
            sigma12 = np.mean((img1 - mu1) * (img2 - mu2))
            c1 = (0.01 * 255) ** 2
            c2 = (0.03 * 255) ** 2
            ssim_val = ((2 * mu1 * mu2 + c1) * (2 * sigma12 + c2)) / \
                       ((mu1**2 + mu2**2 + c1) * (sigma1**2 + sigma2**2 + c2))
            return float(ssim_val)

    @staticmethod
    def lpips_approx(img1: np.ndarray, img2: np.ndarray) -> float:
        """
        Approximate LPIPS using high-frequency L2 distance.
        For exact LPIPS, install lpips package.
        """
        try:
            import lpips
            loss_fn = lpips.LPIPS(net='alex')
            t1 = torch.from_numpy(img1).permute(2, 0, 1).unsqueeze(0) / 255.0 * 2 - 1
            t2 = torch.from_numpy(img2).permute(2, 0, 1).unsqueeze(0) / 255.0 * 2 - 1
            return float(loss_fn(t1, t2).item())
        except ImportError:
            # Fallback: gradient-weighted difference
            gray1 = np.mean(img1, axis=2) if img1.ndim == 3 else img1
            gray2 = np.mean(img2, axis=2) if img2.ndim == 3 else img2
            gy1 = np.gradient(gray1)
            gy2 = np.gradient(gray2)
            return float(np.mean([np.mean((g1 - g2) ** 2) for g1, g2 in zip(gy1, gy2)]))

    @staticmethod
    def robustness_test(encoded_image: np.ndarray,
                        decoder: Callable,
                        original_message: np.ndarray,
                        device: str = 'cpu') -> Dict[str, float]:
        """
        Test detection/decoding accuracy under various simulated attacks.
        Args:
            encoded_image: Stego image (H, W, C) in [0, 255] or [0, 1]
            decoder: Callable that takes image tensor and returns decoded message
            original_message: Ground truth binary message
        Returns:
            Dictionary of attack_name -> accuracy
        """
        scores = {}
        img_tensor = torch.from_numpy(encoded_image).float().permute(2, 0, 1).unsqueeze(0).to(device)

        # Normalize if needed
        if img_tensor.max() > 1.5:
            img_tensor = img_tensor / 255.0

        attacks = {
            'original': lambda x: x,
            'jpeg_70': lambda x: ComprehensiveMetrics._jpeg_compress(x, 70),
            'jpeg_50': lambda x: ComprehensiveMetrics._jpeg_compress(x, 50),
            'gaussian_noise_0.02': lambda x: x + torch.randn_like(x) * 0.02,
            'gaussian_noise_0.05': lambda x: x + torch.randn_like(x) * 0.05,
            'gaussian_blur_1.5': lambda x: ComprehensiveMetrics._gaussian_blur(x, sigma=1.5),
            'crop_50_resize': lambda x: ComprehensiveMetrics._crop_resize(x, 0.5),
            'resize_50': lambda x: F.interpolate(x, scale_factor=0.5, mode='bilinear', align_corners=False),
        }

        for name, attack in attacks.items():
            try:
                attacked = attack(img_tensor)
                attacked = torch.clamp(attacked, 0.0, 1.0)
                with torch.no_grad():
                    decoded = decoder(attacked)
                if isinstance(decoded, torch.Tensor):
                    decoded = (torch.sigmoid(decoded) > 0.5).float().cpu().numpy().flatten()
                else:
                    decoded = np.array(decoded).flatten()
                gt = np.array(original_message).flatten()
                min_len = min(len(decoded), len(gt))
                accuracy = float(np.mean(decoded[:min_len] == gt[:min_len]))
                scores[name] = accuracy
            except Exception as e:
                scores[name] = 0.0

        # Aggregate robustness score (average over all attacks except original)
        attack_scores = [v for k, v in scores.items() if k != 'original']
        scores['robustness_mean'] = float(np.mean(attack_scores)) if attack_scores else 0.0
        return scores

    @staticmethod
    def _jpeg_compress(x: torch.Tensor, quality: int) -> torch.Tensor:
        """Differentiable JPEG approximation via noise injection."""
        noise = torch.zeros_like(x).uniform_(-0.5, 0.5)
        return x + noise * (1.0 / quality)

    @staticmethod
    def _gaussian_blur(x: torch.Tensor, sigma: float = 1.5, kernel_size: int = 7) -> torch.Tensor:
        """Apply Gaussian blur using separable convolution."""
        channels = x.shape[1]
        # Create 1D Gaussian kernel
        coords = torch.arange(kernel_size).float() - kernel_size // 2
        g = torch.exp(-(coords ** 2) / (2 * sigma ** 2))
        g = g / g.sum()
        # 2D kernel
        kernel = g.unsqueeze(0) * g.unsqueeze(1)
        kernel = kernel.unsqueeze(0).unsqueeze(0).to(x.device)
        kernel = kernel.expand(channels, 1, -1, -1)
        padding = kernel_size // 2
        return F.conv2d(x, kernel, padding=padding, groups=channels)

    @staticmethod
    def _crop_resize(x: torch.Tensor, ratio: float) -> torch.Tensor:
        """Random crop and resize back."""
        b, c, h, w = x.shape
        new_h, new_w = int(h * ratio), int(w * ratio)
        if new_h < 2 or new_w < 2:
            return x
        top = (h - new_h) // 2
        left = (w - new_w) // 2
        cropped = x[:, :, top:top + new_h, left:left + new_w]
        return F_torch.interpolate(cropped, size=(h, w), mode='bilinear', align_corners=False)

    @staticmethod
    def batch_metrics(images: torch.Tensor, labels: torch.Tensor,
                      predictions: torch.Tensor) -> Dict[str, float]:
        """
        Compute classification metrics for detection model.
        Args:
            images: Batch of images (B, C, H, W)
            labels: Ground truth labels (B,)
            predictions: Model predictions (B,) in [0, 1]
        """
        preds_binary = (predictions > 0.5).float()
        tp = float(((preds_binary == 1) & (labels == 1)).sum().item())
        tn = float(((preds_binary == 0) & (labels == 0)).sum().item())
        fp = float(((preds_binary == 1) & (labels == 0)).sum().item())
        fn = float(((preds_binary == 0) & (labels == 1)).sum().item())

        accuracy = (tp + tn) / max(tp + tn + fp + fn, 1e-8)
        precision = tp / max(tp + fp, 1e-8)
        recall = tp / max(tp + fn, 1e-8)
        f1 = 2 * precision * recall / max(precision + recall, 1e-8)

        return {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1': float(f1),
            'tp': tp, 'tn': tn, 'fp': fp, 'fn': fn,
        }
