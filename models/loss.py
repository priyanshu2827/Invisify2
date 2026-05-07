import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models


class CombinedLoss(nn.Module):
    """
    Multi-component loss for steganography training that balances:
    - Pixel-level reconstruction accuracy (MSE)
    - Perceptual quality (VGG-based perceptual loss)
    - Frequency domain fidelity (FFT-based loss)
    - Structural similarity (SSIM / MS-SSIM)
    """

    def __init__(self, alpha: float = 0.7, beta: float = 0.2, gamma: float = 0.1, ssim_weight: float = 0.1):
        super(CombinedLoss, self).__init__()
        self.alpha = alpha      # Pixel loss weight
        self.beta = beta        # Perceptual loss weight
        self.gamma = gamma      # Frequency domain loss weight
        self.ssim_weight = ssim_weight

        # VGG19 features for perceptual loss (up to relu4_3)
        vgg = models.vgg19(weights=models.VGG19_Weights.DEFAULT).features[:36]
        for param in vgg.parameters():
            param.requires_grad = False
        self.vgg = vgg
        self.vgg_mean = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
        self.vgg_std = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)

    def _normalize_for_vgg(self, x: torch.Tensor) -> torch.Tensor:
        """Normalize to ImageNet stats expected by VGG."""
        device = x.device
        mean = self.vgg_mean.to(device)
        std = self.vgg_std.to(device)
        return (x - mean) / std

    def perceptual_loss(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        """VGG-based perceptual loss using intermediate feature representations."""
        pred_norm = self._normalize_for_vgg(pred)
        target_norm = self._normalize_for_vgg(target)
        pred_features = self.vgg(pred_norm)
        target_features = self.vgg(target_norm)
        return F.mse_loss(pred_features, target_features)

    def frequency_loss(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        """FFT-based frequency domain loss to preserve spectral characteristics."""
        # Compute 2D FFT per channel
        pred_fft = torch.fft.fft2(pred, dim=(-2, -1))
        target_fft = torch.fft.fft2(target, dim=(-2, -1))
        # Magnitude loss
        mag_loss = F.l1_loss(torch.abs(pred_fft), torch.abs(target_fft))
        # Phase loss (weighted lower)
        phase_loss = F.l1_loss(torch.angle(pred_fft), torch.angle(target_fft))
        return mag_loss + 0.1 * phase_loss

    def ssim_loss(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        """Structural Similarity Loss (approximation without external deps)."""
        # Use a lightweight approximation; for production, install pytorch-msssim
        c1 = 0.01 ** 2
        c2 = 0.03 ** 2
        mu1 = F.avg_pool2d(pred, kernel_size=11, stride=1, padding=5)
        mu2 = F.avg_pool2d(target, kernel_size=11, stride=1, padding=5)
        mu1_sq = mu1 ** 2
        mu2_sq = mu2 ** 2
        mu1_mu2 = mu1 * mu2
        sigma1_sq = F.avg_pool2d(pred ** 2, kernel_size=11, stride=1, padding=5) - mu1_sq
        sigma2_sq = F.avg_pool2d(target ** 2, kernel_size=11, stride=1, padding=5) - mu2_sq
        sigma12 = F.avg_pool2d(pred * target, kernel_size=11, stride=1, padding=5) - mu1_mu2
        ssim_map = ((2 * mu1_mu2 + c1) * (2 * sigma12 + c2)) / \
                   ((mu1_sq + mu2_sq + c1) * (sigma1_sq + sigma2_sq + c2))
        return 1 - ssim_map.mean()

    def forward(self, pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        """
        Compute combined loss.
        Args:
            pred: Predicted / encoded image (B, 3, H, W) in [0, 1] or normalized
            target: Ground-truth / cover image (B, 3, H, W)
        Returns:
            total: Weighted scalar loss
        """
        pixel_loss = F.mse_loss(pred, target)
        perc_loss = self.perceptual_loss(pred, target)
        freq_loss = self.frequency_loss(pred, target)
        ssim_l = self.ssim_loss(pred, target)

        total = (self.alpha * pixel_loss +
                 self.beta * perc_loss +
                 self.gamma * freq_loss +
                 self.ssim_weight * ssim_l)
        return total


class DetectionLoss(nn.Module):
    """
    Combined loss for the detection/decoder network balancing
    message recovery accuracy with cover image preservation.
    """

    def __init__(self, message_weight: float = 1.0, image_weight: float = 1.0,
                 alpha: float = 0.7, beta: float = 0.2, gamma: float = 0.1):
        super(DetectionLoss, self).__init__()
        self.message_weight = message_weight
        self.image_weight = image_weight
        self.image_loss = CombinedLoss(alpha=alpha, beta=beta, gamma=gamma)
        self.bce = nn.BCEWithLogitsLoss()

    def forward(self, encoded_image: torch.Tensor, cover_image: torch.Tensor,
                decoded_message: torch.Tensor, true_message: torch.Tensor) -> torch.Tensor:
        """
        Args:
            encoded_image: Stego image from encoder
            cover_image: Original cover image
            decoded_message: Message logits from decoder
            true_message: Ground-truth binary message
        """
        img_loss = self.image_loss(encoded_image, cover_image)
        msg_loss = self.bce(decoded_message, true_message)
        return self.image_weight * img_loss + self.message_weight * msg_loss
