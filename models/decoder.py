import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np


class DenseBlock(nn.Module):
    """
    Dense block with concatenative skip connections.
    Each layer's output is concatenated to all subsequent layers' inputs.
    """

    def __init__(self, in_channels: int, growth_rate: int = 32, num_layers: int = 6):
        super(DenseBlock, self).__init__()
        self.layers = nn.ModuleList()
        for i in range(num_layers):
            self.layers.append(nn.Sequential(
                nn.BatchNorm2d(in_channels + i * growth_rate),
                nn.ReLU(inplace=True),
                nn.Conv2d(in_channels + i * growth_rate, growth_rate, kernel_size=3, padding=1, bias=False)
            ))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = [x]
        for layer in self.layers:
            out = layer(torch.cat(features, dim=1))
            features.append(out)
        return torch.cat(features, dim=1)


class ImprovedDecoder(nn.Module):
    """
    Multi-scale decoder with SRM (Steganalysis Rich Model) filters for
    detecting hidden patterns, dense blocks for feature refinement,
    and global attention pooling for message recovery.
    """

    def __init__(self, message_length: int = 64):
        super(ImprovedDecoder, self).__init__()

        # Multi-scale feature extraction
        self.scale1 = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=True)
        )
        self.scale2 = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=5, padding=2, bias=False),
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=True)
        )
        self.scale3 = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=7, padding=3, bias=False),
            nn.BatchNorm2d(64),
            nn.LeakyReLU(0.2, inplace=True)
        )

        # SRM filters for detecting noise residuals left by steganography
        self.srm_layer = self._get_srm_filters()

        # Dense blocks for feature refinement
        # Input channels = 64*3 (multi-scale) + 3 (SRM) = 195
        # After first dense block, channels = 195 + 6*32 = 387
        self.dense_block1 = DenseBlock(195, growth_rate=32, num_layers=6)
        out_ch1 = 195 + 6 * 32  # 387

        # Transition + second dense block
        self.transition = nn.Sequential(
            nn.BatchNorm2d(out_ch1),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch1, out_ch1 // 2, kernel_size=1, bias=False),
            nn.AvgPool2d(kernel_size=2, stride=2)
        )
        mid_ch = out_ch1 // 2  # 193

        self.dense_block2 = DenseBlock(mid_ch, growth_rate=32, num_layers=4)
        out_ch2 = mid_ch + 4 * 32  # 321

        # Global attention pooling
        self.global_attention = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(out_ch2, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(256, message_length)
        )

    def _get_srm_filters(self) -> nn.Conv2d:
        """Initialize SRM (Steganalysis Rich Model) filter kernels."""
        # SRM filter kernels commonly used in steganalysis
        filter1 = np.array([[0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0],
                            [0, 1, -2, 1, 0],
                            [0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0]], dtype=np.float32)

        filter2 = np.array([[0, 0, 0, 0, 0],
                            [0, 0, 1, 0, 0],
                            [0, 0, -2, 0, 0],
                            [0, 0, 1, 0, 0],
                            [0, 0, 0, 0, 0]], dtype=np.float32)

        filter3 = np.array([[0, 0, 0, 0, 0],
                            [0, -1, 2, -1, 0],
                            [0, 2, -4, 2, 0],
                            [0, -1, 2, -1, 0],
                            [0, 0, 0, 0, 0]], dtype=np.float32)

        filters = np.stack([filter1, filter2, filter3])  # (3, 5, 5)
        filters = np.expand_dims(filters, axis=1)       # (3, 1, 5, 5)
        filters = np.repeat(filters, 3, axis=1)         # (3, 3, 5, 5)

        srm = nn.Conv2d(3, 3, kernel_size=5, padding=2, bias=False)
        srm.weight = nn.Parameter(torch.tensor(filters), requires_grad=False)
        return srm

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Input image tensor (B, 3, H, W)
        Returns:
            output: Recovered message logits (B, message_length)
        """
        # Multi-scale features
        f1 = self.scale1(x)
        f2 = self.scale2(x)
        f3 = self.scale3(x)

        # SRM noise residual (magnitude to focus on changes)
        srm_features = self.srm_layer(x)
        srm_features = torch.abs(srm_features)

        # Concatenate all features
        combined = torch.cat([f1, f2, f3, srm_features], dim=1)

        # Dense refinement
        refined1 = self.dense_block1(combined)
        trans = self.transition(refined1)
        refined2 = self.dense_block2(trans)

        # Final prediction
        output = self.global_attention(refined2)
        return output


class StegDetectDecoder(nn.Module):
    """
    Binary classifier variant of the decoder for detecting whether
    an image contains hidden data at all (detection, not extraction).
    """

    def __init__(self):
        super(StegDetectDecoder, self).__init__()
        self.feature_extractor = ImprovedDecoder(message_length=256)
        self.classifier = nn.Sequential(
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.3),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.feature_extractor(x)
        return self.classifier(features)
