# Deep Learning Integration Guide

The `models/` package and `api_server.py` add a **PyTorch-based deep learning pipeline** for image steganography detection to Invisify2. It runs alongside the existing statistical (chi-square, RS, SPA) and AI semantic scanners.

## Architecture

```
Frontend Scanner  ->  Next.js /api/scan  ->  scan-service.ts
                                              |
                                              +-- DetectionEngine (statistical)
                                              |
                                              +-- dl-client.ts  ---->  FastAPI (port 8000)
                                                                        |
                                                                        +-- StegDetectDecoder
                                                                        +-- ImprovedDecoder
```

## Quick Start

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Train the models (optional — API works without weights, but accuracy is statistical-only until trained)

```bash
python train.py --data_dir ./data/DIV2K/train --epochs 100 --batch_size 16
```

### 3. Start the Python FastAPI backend

```bash
# Default port 8000
uvicorn api_server:app --host 0.0.0.0 --port 8000
```

### 4. Start the Next.js frontend (in another terminal)

```bash
npm run dev   # or: next dev -p 3000
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PYTHON_API_URL` | `http://localhost:8000` | URL of the FastAPI backend |
| `DL_TIMEOUT_MS` | `8000` | Timeout for deep-learning analysis calls |
| `CHECKPOINT_DIR` | `./checkpoints` | Where `api_server.py` looks for `.pt` weights |

## API Endpoints (Python)

| Endpoint | Purpose |
|---|---|
| `GET /health` | Backend + model load status |
| `POST /analyze` | Single-model detection + optional robustness tests |
| `POST /decode` | Extract hidden binary message |
| `POST /ensemble` | Test-Time Augmentation (TTA) ensemble vote |

## How It Works in the Search Engine

1. **User uploads image** in the Scanner page (`/soc/scanner`)
2. `scanViaApi()` POSTs to `/api/scan`
3. `performScan()` in `scan-service.ts`:
   - Decodes image pixels with `sharp`
   - Calls `analyzeWithDeepLearning()` (dl-client.ts) which forwards the buffer to the Python backend
   - Passes DL results to `DetectionEngine.analyze()`
4. `DetectionEngine` (detection-engine.ts) now has a **new Deep Learning tier**:
   - `dlResults.score >= 75` → adds **40** points (`DL_ANALYSIS_STRONG`)
   - `dlResults.score >= 50` → adds **25** points (`DL_ANALYSIS`)
   - If DL backend is offline, the engine silently falls back to statistical-only detection
5. Final score & severity are returned to the frontend
6. **Frontend badge** (`scan-result-panel.tsx`) shows:
   - `DL + STAT`, `AI + DL + STAT`, or `STAT` depending on which engines fired
   - A cyan **DL Score** card when deep learning contributed

## Training Modes

```bash
# Standard training with early stopping
python train.py --mode train --data_dir ./data/images --epochs 100

# Progressive resolution: 64px -> 128px -> 256px
python train.py --mode progressive --data_dir ./data/images

# Hyperparameter optimization with Optuna
python train.py --mode tune --data_dir ./data/images
```

## Files Added / Modified

| File | Role |
|---|---|
| `models/encoder.py` | ResNet50 backbone + spatial attention |
| `models/decoder.py` | Multi-scale decoder + SRM filters + DenseBlock |
| `models/noise_layer.py` | Differentiable JPEG, blur, noise, crop simulation |
| `models/loss.py` | Combined loss (MSE + VGG perceptual + FFT + SSIM) |
| `models/augmentation.py` | Advanced training-time augmentations |
| `models/dataset.py` | Multi-source image dataset |
| `models/trainer.py` | AdamW + cosine annealing + AMP + progressive training |
| `models/metrics.py` | PSNR, SSIM, BER, LPIPS, robustness tests |
| `models/postprocessor.py` | Ensemble detection, TTA, error correction |
| `models/hyperparam_tuner.py` | Optuna HPO |
| `train.py` | Main training entry point |
| `api_server.py` | FastAPI inference server |
| `src/lib/dl-client.ts` | TypeScript bridge to Python API |
| `src/lib/scan-service.ts` | Calls DL client during image scans |
| `src/lib/detection-engine.ts` | New DL_ANALYSIS weights + tier in cascade |
| `src/components/soc/scan-result-panel.tsx` | Shows DL badge + score in UI |
| `requirements.txt` | Added pytorch-msssim, optuna, lpips, scikit-image, albumentations |

## Fallback Behavior

If the Python backend is **not running** or **no checkpoints exist**, the scan engine:
- Continues with the full statistical image analysis pipeline (chi-square, RS, SPA, LBP, DCT, etc.)
- Does **not** reduce accuracy — it simply operates without the DL boost
- Retries the DL call on the next scan automatically
