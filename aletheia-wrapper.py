#!/usr/bin/env python3
"""
Aletheia Steganalysis Wrapper for Invisify2

Bridges Aletheia's statistical steganalysis detectors into the Invisify2
search engine pipeline. Accepts an image path, runs SPA / RS / Chi-square
attacks via Aletheia CLI, and returns structured JSON.

Usage:
    python aletheia-wrapper.py <image_path>
"""

import sys
import json
import os
import subprocess
import tempfile
import base64
from pathlib import Path


def find_aletheia_script():
    """Locate Aletheia's main CLI script within the project."""
    candidates = [
        os.path.join(os.path.dirname(__file__), "aletheia", "aletheia.py"),
        os.path.join(os.path.dirname(__file__), "..", "aletheia", "aletheia.py"),
        os.path.join(os.path.dirname(__file__), "aletheia", "aletheia"),
        "aletheia/aletheia.py",
        "aletheia/aletheia",
    ]
    for path in candidates:
        if os.path.exists(path):
            return os.path.abspath(path)
    return None


def run_aletheia_command(script, command, image_path, cwd=None):
    """Execute an Aletheia CLI command and return parsed output."""
    try:
        cmd = [sys.executable, script, command, image_path]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=cwd or os.path.dirname(script),
        )

        stdout = result.stdout.strip()
        stderr = result.stderr.strip()

        if result.returncode != 0:
            return {"error": f"Exit code {result.returncode}", "stderr": stderr[:500], "raw": stdout[:500]}

        # Aletheia detectors typically emit a single float or "0.0" / "1.0"
        lines = [l.strip() for l in stdout.splitlines() if l.strip()]
        if not lines:
            return {"error": "Empty output", "raw": stdout}

        # First line is usually the numeric result
        try:
            value = float(lines[0])
            return {"value": value, "raw": stdout}
        except ValueError:
            # Could be textual output; try to find a float in the first few lines
            for line in lines[:5]:
                try:
                    value = float(line)
                    return {"value": value, "raw": stdout}
                except ValueError:
                    continue
            return {"error": "Non-numeric output", "raw": stdout[:500]}

    except subprocess.TimeoutExpired:
        return {"error": "Timeout (30s)"}
    except Exception as e:
        return {"error": str(e)}


def analyze_image_steganography(image_path):
    """Run Aletheia detectors against an image and return JSON results."""
    results = {}

    script = find_aletheia_script()
    if not script:
        return json.dumps({
            "error": "Aletheia not found. Run: git clone https://github.com/daniellerch/aletheia.git"
        })

    # Detector map: (cli_command, key, display_name, positive_threshold)
    detectors = [
        ("spa", "spa", "Sample Pairs Analysis", 0.5),
        ("rs", "rs_analysis", "RS Analysis", 0.5),
        ("chi", "chi_square", "Chi-Square Test", 0.5),
        ("calibration", "primary_quantization", "Primary Quantization (Calibration)", 0.5),
    ]

    for cli_cmd, key, name, threshold in detectors:
        raw = run_aletheia_command(script, cli_cmd, image_path)

        if "error" in raw:
            results[key] = {
                "description": name,
                "error": raw["error"],
                "raw": raw.get("raw", ""),
            }
        else:
            val = raw["value"]
            # Aletheia SPA/RS/Chi often return embedding rate (0-1) or p-value
            # High embedding rate (> threshold) means stego suspected
            # For p-values, small value means suspicious; but Aletheia CLI varies.
            # We treat value > threshold as positive for embedding-rate style outputs.
            results[key] = {
                "positive": bool(val > threshold),
                "confidence": float(val),
                "description": name,
            }

    return json.dumps(results)


def decode_base64_and_analyze(b64_string):
    """Decode a base64 PNG/JPEG string, write to temp file, analyze, clean up."""
    try:
        data = base64.b64decode(b64_string)
        suffix = ".png" if data[:4] == b"\x89PNG" else ".jpg"
        fd, path = tempfile.mkstemp(suffix=suffix)
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(data)
            return analyze_image_steganography(path)
        finally:
            try:
                os.remove(path)
            except Exception:
                pass
    except Exception as e:
        return json.dumps({"error": f"Base64 decode failed: {str(e)}"})


if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        # Support base64-encoded image as first arg if it looks like base64
        if len(arg) > 100 and not os.path.exists(arg):
            print(decode_base64_and_analyze(arg))
        else:
            print(analyze_image_steganography(arg))
    else:
        print(json.dumps({"error": "No image path or base64 data provided"}))
