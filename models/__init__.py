"""
Invisify2 - Deep Learning Image Steganography Detection Models

This package contains 10 major improvements for image detection accuracy:
1. Pre-trained backbone encoder with attention mechanism
2. Multi-scale decoder with SRM filters
3. Differentiable noise layer for robustness training
4. Combined multi-component loss function
5. Advanced data augmentation pipeline
6. Multi-source dataset handler
7. Improved trainer with mixed precision & progressive training
8. Comprehensive evaluation metrics
9. Post-processing with ensemble & TTA
10. Hyperparameter optimization with Optuna
"""

from .encoder import ImprovedEncoder
from .decoder import ImprovedDecoder, DenseBlock, StegDetectDecoder
from .noise_layer import NoiseLayer
from .loss import CombinedLoss
from .augmentation import AdvancedAugmentation
from .dataset import ImprovedDataset
from .trainer import ImprovedTrainer
from .metrics import ComprehensiveMetrics
from .postprocessor import PostProcessor
from .hyperparam_tuner import run_hyperparam_study

__all__ = [
    'ImprovedEncoder',
    'ImprovedDecoder',
    'DenseBlock',
    'StegDetectDecoder',
    'NoiseLayer',
    'CombinedLoss',
    'AdvancedAugmentation',
    'ImprovedDataset',
    'ImprovedTrainer',
    'ComprehensiveMetrics',
    'PostProcessor',
    'run_hyperparam_study',
]
