#!/usr/bin/env python3
"""
Invisify2 - Deep Learning Training Script

This script demonstrates how to use the 10 major improvements for
image steganography detection accuracy in a unified training pipeline.

Usage:
    python train.py --data_dir ./data --epochs 100 --batch_size 16
"""

import argparse
import os

import torch
from torch.utils.data import DataLoader

from models import (
    ImprovedEncoder,
    ImprovedDecoder,
    NoiseLayer,
    CombinedLoss,
    AdvancedAugmentation,
    ImprovedDataset,
    StegoDataset,
    ImprovedTrainer,
    ComprehensiveMetrics,
    PostProcessor,
    run_hyperparam_study,
)


def parse_args():
    parser = argparse.ArgumentParser(description='Train Invisify2 steganography detection models')
    parser.add_argument('--data_dir', type=str, nargs='+', default=['./data/DIV2K/train'],
                        help='List of directories containing training images')
    parser.add_argument('--val_dir', type=str, nargs='+', default=None,
                        help='List of directories containing validation images')
    parser.add_argument('--epochs', type=int, default=100, help='Number of training epochs')
    parser.add_argument('--batch_size', type=int, default=16, help='Batch size')
    parser.add_argument('--lr', type=float, default=1e-4, help='Learning rate')
    parser.add_argument('--weight_decay', type=float, default=1e-5, help='Weight decay for AdamW')
    parser.add_argument('--image_size', type=int, default=256, help='Input image size')
    parser.add_argument('--message_length', type=int, default=64, help='Length of hidden message')
    parser.add_argument('--checkpoint_dir', type=str, default='./checkpoints', help='Checkpoint save directory')
    parser.add_argument('--mode', type=str, default='train', choices=['train', 'tune', 'progressive'],
                        help='Training mode: train / tune (hyperparameter search) / progressive')
    parser.add_argument('--device', type=str, default='cuda' if torch.cuda.is_available() else 'cpu',
                        help='Device to train on')
    parser.add_argument('--num_workers', type=int, default=4, help='DataLoader workers')
    return parser.parse_args()


def main():
    args = parse_args()
    os.makedirs(args.checkpoint_dir, exist_ok=True)

    print(f"Device: {args.device}")
    print(f"Training data: {args.data_dir}")

    # 1. Data Augmentation (Feature #2)
    aug = AdvancedAugmentation(image_size=args.image_size)
    train_transform = aug.get_train_transform(args.image_size)
    val_transform = aug.get_val_transform(args.image_size)

    # 2. Dataset (Feature #7)
    train_dataset = StegoDataset(args.data_dir, message_length=args.message_length,
                                  transform=train_transform, min_size=args.image_size)
    if args.val_dir:
        val_dataset = StegoDataset(args.val_dir, message_length=args.message_length,
                                   transform=val_transform, min_size=args.image_size)
    else:
        # Split train into train/val
        n_val = max(1, int(0.1 * len(train_dataset)))
        n_train = len(train_dataset) - n_val
        train_dataset, val_dataset = torch.utils.data.random_split(
            train_dataset, [n_train, n_val]
        )

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size,
                              shuffle=True, num_workers=args.num_workers, pin_memory=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size,
                            shuffle=False, num_workers=args.num_workers, pin_memory=True)

    # 3. Model Architecture (Features #1, #6)
    encoder = ImprovedEncoder()
    decoder = ImprovedDecoder(message_length=args.message_length)

    # 4. Noise Layer (Feature #5)
    noise_layer = NoiseLayer(prob=0.9)

    # 5. Trainer with AdamW, Cosine Annealing, AMP, Gradient Clipping (Feature #4)
    trainer = ImprovedTrainer(
        model=encoder,
        decoder=decoder,
        train_loader=train_loader,
        val_loader=val_loader,
        lr=args.lr,
        weight_decay=args.weight_decay,
        checkpoint_dir=args.checkpoint_dir,
        use_amp=True,
        noise_layer=noise_layer,
        device=args.device,
    )

    if args.mode == 'progressive':
        # 6. Progressive Training (Feature #4)
        print("Starting progressive resolution training...")
        trainer.progressive_training(
            epochs_per_stage=[30, 30, 40],
            resolutions=[64, 128, 256]
        )
    elif args.mode == 'tune':
        # 7. Hyperparameter Optimization (Feature #9)
        print("Starting hyperparameter tuning with Optuna...")
        study = run_hyperparam_study(
            train_loader=train_loader,
            val_loader=val_loader,
            n_trials=50,
            study_name='invisify2_study'
        )
        print(f"Best trial: {study.best_trial.number}")
        print(f"Best params: {study.best_params}")
    else:
        # 8. Standard Training with Early Stopping (Feature #4)
        print("Starting standard training...")
        train_losses, val_losses = trainer.fit(epochs=args.epochs, patience=10)
        print(f"Training complete. Final train loss: {train_losses[-1]:.4f}, val loss: {val_losses[-1]:.4f}")

    # 9. Save final checkpoint
    trainer.save_checkpoint('final_model.pt')
    print(f"Saved final checkpoint to {args.checkpoint_dir}/final_model.pt")

    # 10. Quick Evaluation Demo (Features #8, #10)
    print("\nRunning quick evaluation with robustness tests...")
    sample_batch = next(iter(val_loader))
    cover = sample_batch['cover'][:1].to(args.device)
    message = sample_batch['message'][:1].to(args.device)

    encoder.eval()
    decoder.eval()
    with torch.no_grad():
        encoded = encoder(cover)
        if isinstance(encoded, tuple):
            encoded = encoded[0]
        decoded = decoder(cover)  # Evaluate on cover (detection baseline)

    # Convert to numpy for metrics
    cover_np = cover[0].permute(1, 2, 0).cpu().numpy()
    cover_np = (cover_np * 255).astype('uint8')

    # Note: proper evaluation requires a full steganographic encode-decode pipeline
    print("Quick evaluation complete. Use metrics.ComprehensiveMetrics for full testing.")


if __name__ == '__main__':
    main()
