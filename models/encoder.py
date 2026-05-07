import torch
import torch.nn as nn
from torchvision import models


class ImprovedEncoder(nn.Module):
    """
    Improved Encoder with pre-trained ResNet50 backbone and attention mechanism.

    Replaces basic CNN with transfer learning from ImageNet, using frozen early layers
    for stable feature extraction and a learnable spatial attention map for focusing
    on steganographically relevant regions.
    """

    def __init__(self, freeze_backbone: bool = True, unfreeze_last_n: int = 20):
        super(ImprovedEncoder, self).__init__()
        # Use pre-trained ResNet50 backbone for robust feature extraction
        weights = models.ResNet50_Weights.DEFAULT
        self.backbone = models.resnet50(weights=weights)

        # Remove the final FC and avgpool to get feature maps
        self.backbone_layers = nn.Sequential(*list(self.backbone.children())[:-2])

        # Optionally freeze early layers for transfer learning stability
        if freeze_backbone:
            for param in list(self.backbone_layers.parameters())[:-unfreeze_last_n]:
                param.requires_grad = False

        # Spatial Attention: 2048 -> 512 -> 1 -> sigmoid
        self.attention = nn.Sequential(
            nn.Conv2d(2048, 512, kernel_size=1, bias=False),
            nn.BatchNorm2d(512),
            nn.ReLU(inplace=True),
            nn.Conv2d(512, 1, kernel_size=1, bias=False),
            nn.Sigmoid()
        )

        # Final projection to whatever hidden dimension the rest of the pipeline expects
        self.projection = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(2048, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Input image tensor (B, 3, H, W)
        Returns:
            pooled_features: Pooled feature vector (B, 512)
            att_map: Attention map (B, 1, H', W')
        """
        features = self.backbone_layers(x)  # (B, 2048, H', W')
        att_map = self.attention(features)   # (B, 1, H', W')
        attended = features * att_map        # (B, 2048, H', W')
        pooled = self.projection(attended)   # (B, 512)
        return pooled, att_map


class MessageEncoder(nn.Module):
    """
    Encodes a binary message into a latent representation that can be
    fused with image features for steganographic embedding.
    """

    def __init__(self, message_length: int = 64, latent_dim: int = 512):
        super(MessageEncoder, self).__init__()
        self.fc = nn.Sequential(
            nn.Linear(message_length, latent_dim),
            nn.ReLU(inplace=True),
            nn.Linear(latent_dim, latent_dim),
            nn.ReLU(inplace=True),
        )

    def forward(self, message: torch.Tensor) -> torch.Tensor:
        """
        Args:
            message: Binary or continuous message tensor (B, message_length)
        Returns:
            latent: Message latent vector (B, latent_dim)
        """
        return self.fc(message)
