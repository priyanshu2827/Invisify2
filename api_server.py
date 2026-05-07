#!/usr/bin/env python3
"""
Invisify2 - FastAPI Deep Learning Steganography Detection Backend

Serves the PyTorch models for real-time image steganalysis.
Run:  uvicorn api_server:app --host 0.0.0.0 --port 8000
"""

import base64
import io
import os
from typing import Optional

import numpy as np
from PIL import Image
import torch
import torch.nn.functional as F
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import (
    ImprovedDecoder,
    StegDetectDecoder,
    NoiseLayer,
    ComprehensiveMetrics,
    PostProcessor,
)

CHECKPOINT_DIR = os.environ.get("CHECKPOINT_DIR", "./checkpoints")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

app = FastAPI(
    title="Invisify2 Deep Learning Detection API",
    version="2.0.0",
    description="ResNet+Attention encoder, Multi-scale+SRM decoder, and robustness noise layers.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production via env var
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

steg_detect_model: Optional[StegDetectDecoder] = None
message_decoder: Optional[ImprovedDecoder] = None
noise_layer: Optional[NoiseLayer] = None
MODEL_LOADED = False


def load_models() -> dict:
    """Lazy-load models and checkpoints."""
    global steg_detect_model, message_decoder, noise_layer, MODEL_LOADED

    if steg_detect_model is not None:
        return {"status": "ready", "device": str(DEVICE)}

    steg_detect_model = StegDetectDecoder().to(DEVICE)
    message_decoder = ImprovedDecoder(message_length=64).to(DEVICE)
    noise_layer = NoiseLayer(prob=0.0).to(DEVICE)  # eval mode only

    detect_ckpt = os.path.join(CHECKPOINT_DIR, "stegdetect_best.pt")
    decoder_ckpt = os.path.join(CHECKPOINT_DIR, "decoder_best.pt")

    loaded = []
    if os.path.exists(detect_ckpt):
        steg_detect_model.load_state_dict(torch.load(detect_ckpt, map_location=DEVICE))
        loaded.append("steg_detect")
    if os.path.exists(decoder_ckpt):
        message_decoder.load_state_dict(torch.load(decoder_ckpt, map_location=DEVICE))
        loaded.append("message_decoder")

    steg_detect_model.eval()
    message_decoder.eval()

    if len(loaded) >= 1:
        MODEL_LOADED = True
        return {"status": "ready", "device": str(DEVICE), "loaded": loaded}
    return {"status": "not_ready", "device": str(DEVICE), "message": "No checkpoints found. Run train.py first."}


# ---------------------------------------------------------------------------
# Preprocessing helpers
# ---------------------------------------------------------------------------

IMAGENET_MEAN = torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1).to(DEVICE)
IMAGENET_STD = torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1).to(DEVICE)


def preprocess_image(pil_img: Image.Image, size: int = 256) -> torch.Tensor:
    """Resize, convert to tensor, and ImageNet-normalize."""
    pil_img = pil_img.convert("RGB").resize((size, size), Image.BILINEAR)
    arr = np.array(pil_img).astype(np.float32) / 255.0
    tensor = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).to(DEVICE)
    tensor = (tensor - IMAGENET_MEAN) / IMAGENET_STD
    return tensor


def tensor_to_base64(tensor: torch.Tensor) -> str:
    """Convert a tensor back to base64 PNG for optional return."""
    tensor = tensor.detach().cpu().squeeze(0)
    tensor = tensor * IMAGENET_STD + IMAGENET_MEAN
    tensor = torch.clamp(tensor, 0.0, 1.0)
    arr = (tensor.permute(1, 2, 0).numpy() * 255).astype(np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    device: str
    model_loaded: bool


class AnalyzeResponse(BaseModel):
    status: str
    model_loaded: bool
    is_stego: bool
    confidence: float
    score: float
    message_decoded: Optional[str]
    robustness: Optional[dict]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health():
    load_models()
    return {
        "status": "ok",
        "device": str(DEVICE),
        "model_loaded": MODEL_LOADED,
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_image(
    file: Optional[UploadFile] = File(None),
    base64_image: Optional[str] = Form(None),
    run_robustness: bool = Form(False),
    image_size: int = Form(256),
):
    """
    Analyze an image for steganographic content.
    Accepts either a multipart file upload or a base64-encoded image string.
    """
    load_info = load_models()
    is_ready = load_info.get("status") == "ready"

    # Decode input
    if file is not None:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents))
    elif base64_image is not None:
        contents = base64.b64decode(base64_image)
        pil_img = Image.open(io.BytesIO(contents))
    else:
        return {
            "status": "error",
            "model_loaded": MODEL_LOADED,
            "is_stego": False,
            "confidence": 0.0,
            "score": 0.0,
            "message_decoded": None,
            "robustness": None,
        }

    tensor = preprocess_image(pil_img, size=image_size)

    with torch.no_grad():
        # --- Detection branch ---
        detect_prob = 0.5
        if is_ready and steg_detect_model is not None:
            detect_out = steg_detect_model(tensor)
            detect_prob = float(detect_out.item())

        # --- Message decoding branch ---
        decoded_bits = None
        if is_ready and message_decoder is not None:
            msg_logits = message_decoder(tensor)
            decoded_bits = (torch.sigmoid(msg_logits) > 0.5).float().cpu().numpy()

    # Score mapping: probability -> 0-100 sentinel-style score
    score = detect_prob * 100.0
    is_stego = score >= 40.0
    confidence = 0.5 + abs(detect_prob - 0.5)

    response = {
        "status": "analyzed",
        "model_loaded": MODEL_LOADED,
        "is_stego": is_stego,
        "confidence": round(confidence, 4),
        "score": round(score, 2),
        "message_decoded": decoded_bits.tobytes().hex() if decoded_bits is not None else None,
        "robustness": None,
    }

    # Optional: robustness test with noise layer
    if run_robustness and is_ready and noise_layer is not None and steg_detect_model is not None:
        robust_scores = {}
        with torch.no_grad():
            for i in range(5):
                attacked = noise_layer(tensor, training=True)
                attacked = torch.clamp(attacked, -3.0, 3.0)  # clamp in normalized space
                prob = float(torch.sigmoid(steg_detect_model(attacked)).item())
                robust_scores[f"attack_{i+1}"] = round(prob, 4)
        robust_scores["mean"] = round(sum(robust_scores.values()) / len(robust_scores), 4)
        response["robustness"] = robust_scores

    return response


@app.post("/decode")
async def decode_message(
    file: Optional[UploadFile] = File(None),
    base64_image: Optional[str] = Form(None),
    message_length: int = Form(64),
    image_size: int = Form(256),
):
    """
    Extract a hidden binary message from a suspected stego image.
    """
    load_models()

    if file is not None:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents))
    elif base64_image is not None:
        contents = base64.b64decode(base64_image)
        pil_img = Image.open(io.BytesIO(contents))
    else:
        return {"status": "error", "message": "No image provided"}

    tensor = preprocess_image(pil_img, size=image_size)

    if message_decoder is None:
        return {"status": "not_ready", "message_bits": None}

    with torch.no_grad():
        logits = message_decoder(tensor)
        bits = (torch.sigmoid(logits) > 0.5).int().cpu().numpy().tolist()

    return {
        "status": "decoded",
        "model_loaded": MODEL_LOADED,
        "message_bits": bits[0] if isinstance(bits, list) and len(bits) > 0 else bits,
    }


@app.post("/ensemble")
async def ensemble_analyze(
    file: Optional[UploadFile] = File(None),
    base64_image: Optional[str] = Form(None),
    image_size: int = Form(256),
):
    """
    Ensemble detection using TTA (test-time augmentation).
    Returns a consensus score averaged over flips and rotations.
    """
    load_models()

    if file is not None:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents))
    elif base64_image is not None:
        contents = base64.b64decode(base64_image)
        pil_img = Image.open(io.BytesIO(contents))
    else:
        return {"status": "error", "message": "No image provided"}

    tensor = preprocess_image(pil_img, size=image_size)

    if steg_detect_model is None:
        return {"status": "not_ready", "ensemble_score": None}

    avg_score = PostProcessor.test_time_augmentation(
        tensor, steg_detect_model, num_augments=6, device=str(DEVICE)
    )
    avg_prob = float(avg_score.mean().item())

    return {
        "status": "analyzed",
        "model_loaded": MODEL_LOADED,
        "ensemble_score": round(avg_prob * 100, 2),
        "is_stego": avg_prob >= 0.4,
        "confidence": round(0.5 + abs(avg_prob - 0.5), 4),
    }


# ---------------------------------------------------------------------------
# Startup hook
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event():
    info = load_models()
    print(f"[Invisify2 DL API] {info}")
