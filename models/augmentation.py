import io
import random
from typing import Optional, Tuple

import numpy as np
import torch
from PIL import Image, ImageFilter
from torchvision import transforms


class AdvancedAugmentation:
    """
    Augmentation pipeline that simulates real-world image transformations
    including JPEG compression, Gaussian noise, geometric distortions,
    and color shifts. Designed to improve detector generalization.
    """

    def __init__(self, image_size: int = 256, jpeg_quality_range: Tuple[int, int] = (50, 95),
                 noise_level: float = 0.02):
        self.image_size = image_size
        self.jpeg_quality_range = jpeg_quality_range
        self.noise_level = noise_level

        self.base_transform = transforms.Compose([
            transforms.RandomResizedCrop(image_size, scale=(0.8, 1.0)),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.3),
            transforms.RandomRotation(15),
            transforms.ColorJitter(
                brightness=0.3,
                contrast=0.3,
                saturation=0.3,
                hue=0.1
            ),
        ])

        self.tensor_transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                               std=[0.229, 0.224, 0.225])
        ])

    def __call__(self, img: Image.Image) -> torch.Tensor:
        """Apply augmentations and return normalized tensor."""
        # Geometric + color augmentations
        img = self.base_transform(img)

        # JPEG compression simulation (50% chance)
        if random.random() < 0.5:
            img = self.jpeg_compress(img)

        # Gaussian noise addition (50% chance)
        if random.random() < 0.5:
            img = self.add_noise(img)

        # Optional Gaussian blur (30% chance)
        if random.random() < 0.3:
            img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 1.5)))

        return self.tensor_transform(img)

    def jpeg_compress(self, img: Image.Image) -> Image.Image:
        """Simulate JPEG compression artifacts by re-saving at random quality."""
        quality = random.randint(*self.jpeg_quality_range)
        buffer = io.BytesIO()
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img.save(buffer, format='JPEG', quality=quality)
        buffer.seek(0)
        return Image.open(buffer)

    def add_noise(self, img: Image.Image) -> Image.Image:
        """Add Gaussian noise to simulate sensor noise."""
        img_array = np.array(img).astype(np.float32) / 255.0
        noise = np.random.normal(0, self.noise_level, img_array.shape)
        noisy = np.clip(img_array + noise, 0, 1)
        return Image.fromarray((noisy * 255).astype(np.uint8))

    @staticmethod
    def get_train_transform(image_size: int = 256) -> transforms.Compose:
        """Return a standard training transform pipeline."""
        return transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                               std=[0.229, 0.224, 0.225])
        ])

    @staticmethod
    def get_val_transform(image_size: int = 256) -> transforms.Compose:
        """Return a standard validation transform pipeline."""
        return transforms.Compose([
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                               std=[0.229, 0.224, 0.225])
        ])


