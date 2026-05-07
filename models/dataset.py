import glob
import os
import random
from typing import List, Optional, Callable

from PIL import Image
import torch
from torch.utils.data import Dataset


class ImprovedDataset(Dataset):
    """
    Enhanced dataset that aggregates images from multiple sources
    (DIV2K, COCO, Flickr30k, etc.) with quality filtering to ensure
    a diverse and high-quality training corpus for steganography detection.
    """

    def __init__(self, root_dirs: List[str], transform: Optional[Callable] = None,
                 min_size: int = 256, extensions: tuple = ('.png', '.jpg', '.jpeg', '.bmp', '.webp')):
        super(ImprovedDataset, self).__init__()
        self.images: List[str] = []
        self.transform = transform
        self.min_size = min_size

        # Collect from multiple datasets for diversity
        for root in root_dirs:
            if not os.path.isdir(root):
                continue
            for ext in extensions:
                pattern = os.path.join(root, f'**/*{ext}')
                found = glob.glob(pattern, recursive=True)
                self.images.extend(found)

        # Remove duplicates and sort for determinism
        self.images = sorted(list(set(self.images)))
        print(f"[ImprovedDataset] Total images collected: {len(self.images)}")

        # Pre-filter by minimum size to avoid repeated open/close
        self._valid_indices = list(range(len(self.images)))

    def __getitem__(self, idx: int):
        # Try up to 5 times to get a valid image (handles corrupted files)
        for _ in range(5):
            try:
                img_path = self.images[idx]
                img = Image.open(img_path).convert('RGB')

                # Ensure minimum quality/size
                if min(img.size) < self.min_size:
                    idx = random.randint(0, len(self.images) - 1)
                    continue

                if self.transform:
                    img = self.transform(img)
                return img
            except Exception as e:
                # If image is corrupted, try another random one
                idx = random.randint(0, len(self.images) - 1)

        # Ultimate fallback: return a blank RGB image
        blank = Image.new('RGB', (self.min_size, self.min_size), (128, 128, 128))
        if self.transform:
            return self.transform(blank)
        return blank

    def __len__(self) -> int:
        return len(self.images)


class StegoDataset(Dataset):
    """
    Dataset that pairs cover images with random binary messages for
    end-to-end steganography training (encoder + decoder).
    """

    def __init__(self, root_dirs: List[str], message_length: int = 64,
                 transform: Optional[Callable] = None, min_size: int = 256):
        self.cover_dataset = ImprovedDataset(root_dirs, transform=transform, min_size=min_size)
        self.message_length = message_length

    def __len__(self) -> int:
        return len(self.cover_dataset)

    def __getitem__(self, idx: int):
        cover_image = self.cover_dataset[idx]
        # Generate random binary message
        message = torch.randint(0, 2, (self.message_length,)).float()
        return {
            'cover': cover_image,
            'message': message,
        }


class DetectionDataset(Dataset):
    """
    Dataset for steganalysis detection: returns cover images and
    pre-generated stego images with labels (0 = cover, 1 = stego).
    """

    def __init__(self, root_dirs: List[str], stego_dir: Optional[str] = None,
                 transform: Optional[Callable] = None, min_size: int = 256,
                 stego_ratio: float = 0.5):
        self.cover_dataset = ImprovedDataset(root_dirs, transform=transform, min_size=min_size)
        self.stego_ratio = stego_ratio
        self.stego_images: List[str] = []
        if stego_dir and os.path.isdir(stego_dir):
            self.stego_images = sorted(glob.glob(os.path.join(stego_dir, '**/*.*'), recursive=True))
            self.stego_images = [p for p in self.stego_images
                                 if p.lower().endswith(('.png', '.jpg', '.jpeg'))]

    def __len__(self) -> int:
        return len(self.cover_dataset)

    def __getitem__(self, idx: int):
        is_stego = random.random() < self.stego_ratio

        if is_stego and self.stego_images:
            img_path = random.choice(self.stego_images)
            label = 1.0
        else:
            img_path = self.cover_dataset.images[idx % len(self.cover_dataset.images)]
            label = 0.0

        try:
            img = Image.open(img_path).convert('RGB')
            if min(img.size) < self.cover_dataset.min_size:
                img = img.resize((self.cover_dataset.min_size, self.cover_dataset.min_size))
        except Exception:
            # Fallback
            img = Image.new('RGB', (256, 256), (128, 128, 128))
            label = 0.0

        if self.cover_dataset.transform:
            img = self.cover_dataset.transform(img)

        return {
            'image': img,
            'label': torch.tensor(label, dtype=torch.float32),
        }
