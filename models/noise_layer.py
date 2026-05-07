import torch
import torch.nn as nn
import torch.nn.functional as F
import random


class NoiseLayer(nn.Module):
    """
    Differentiable noise layer that simulates real-world image distortions
    during training. This forces the model to learn robust representations
    that survive JPEG compression, resizing, noise addition, and cropping.
    """

    def __init__(self, prob: float = 0.9):
        super(NoiseLayer, self).__init__()
        self.prob = prob  # Probability of applying any distortion

    def forward(self, encoded_image: torch.Tensor, training: bool = True) -> torch.Tensor:
        if not training or random.random() > self.prob:
            return encoded_image

        # Randomly apply one or more distortions
        distortions = [
            self.jpeg_simulation,
            self.gaussian_blur,
            self.dropout_pixels,
            self.crop_and_resize,
            self.gaussian_noise,
            self.salt_pepper_noise,
            self.color_jitter,
        ]

        # Apply 1-3 random distortions
        num_distortions = random.randint(1, 3)
        selected = random.sample(distortions, num_distortions)

        result = encoded_image
        for distortion in selected:
            result = distortion(result)
        return result

    def jpeg_simulation(self, x: torch.Tensor, quality_factor: int = 50) -> torch.Tensor:
        """
        Differentiable JPEG approximation using differentiable rounding noise.
        Mimics quantization artifacts from JPEG compression.
        """
        noise = torch.zeros_like(x).uniform_(-0.5, 0.5)
        return x + noise * (1.0 / quality_factor)

    def gaussian_blur(self, x: torch.Tensor, kernel_size: int = 5) -> torch.Tensor:
        """Apply Gaussian blur via depthwise convolution."""
        channels = x.shape[1]
        kernel = self._gaussian_kernel(kernel_size).to(x.device)
        kernel = kernel.expand(channels, 1, -1, -1)
        padding = kernel_size // 2
        return F.conv2d(x, kernel, padding=padding, groups=channels)

    def dropout_pixels(self, x: torch.Tensor, p: float = 0.1) -> torch.Tensor:
        """Randomly zero out pixels to simulate transmission loss."""
        if p <= 0:
            return x
        mask = torch.bernoulli(torch.ones_like(x) * (1 - p))
        return x * mask

    def crop_and_resize(self, x: torch.Tensor, min_ratio: float = 0.7) -> torch.Tensor:
        """Random crop and resize back to original dimensions."""
        ratio = random.uniform(min_ratio, 1.0)
        b, c, h, w = x.shape
        new_h, new_w = int(h * ratio), int(w * ratio)
        if new_h < 2 or new_w < 2:
            return x
        top = random.randint(0, h - new_h)
        left = random.randint(0, w - new_w)
        cropped = x[:, :, top:top + new_h, left:left + new_w]
        return F.interpolate(cropped, size=(h, w), mode='bilinear', align_corners=False)

    def gaussian_noise(self, x: torch.Tensor, std: float = 0.02) -> torch.Tensor:
        """Add Gaussian noise."""
        noise = torch.randn_like(x) * std
        return torch.clamp(x + noise, 0.0, 1.0)

    def salt_pepper_noise(self, x: torch.Tensor, amount: float = 0.02) -> torch.Tensor:
        """Add salt-and-pepper noise."""
        salt = torch.rand_like(x) < (amount / 2)
        pepper = torch.rand_like(x) < (amount / 2)
        x = torch.where(salt, torch.ones_like(x), x)
        x = torch.where(pepper, torch.zeros_like(x), x)
        return x

    def color_jitter(self, x: torch.Tensor, strength: float = 0.1) -> torch.Tensor:
        """Random brightness, contrast, and saturation jitter."""
        # Brightness
        brightness = 1.0 + (random.random() - 0.5) * 2 * strength
        x = x * brightness
        # Contrast
        mean = x.mean(dim=[2, 3], keepdim=True)
        contrast = 1.0 + (random.random() - 0.5) * 2 * strength
        x = (x - mean) * contrast + mean
        return torch.clamp(x, 0.0, 1.0)

    def _gaussian_kernel(self, size: int, sigma: float = 1.0) -> torch.Tensor:
        """Create a 2D Gaussian kernel."""
        coords = torch.arange(size).float() - size // 2
        g = torch.exp(-(coords ** 2) / (2 * sigma ** 2))
        g = torch.outer(g, g)
        return (g / g.sum()).unsqueeze(0).unsqueeze(0)
