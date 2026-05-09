"""Download the YAMNet TFLite model and labels.

Usage:
    pip install -r tools/requirements.txt
    python tools/download_yamnet.py

Writes:
    ml/models/yamnet.tflite
    ml/labels/yamnet_class_map.csv

After this completes, copy the .tflite into app/assets/models/yamnet.tflite so
Metro bundles it with the app.
"""
from __future__ import annotations

import os
import sys
import urllib.request
from pathlib import Path

# Google's published TFLite build of YAMNet on TensorFlow Hub.
TFLITE_URL = (
    "https://storage.googleapis.com/mediapipe-models/audio_classifier/"
    "yamnet/float32/latest/yamnet.tflite"
)
LABELS_URL = (
    "https://raw.githubusercontent.com/tensorflow/models/master/research/"
    "audioset/yamnet/yamnet_class_map.csv"
)

ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "models"
LABELS_DIR = ROOT / "labels"


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {url}\n  -> {dest}")
    with urllib.request.urlopen(url) as resp, open(dest, "wb") as f:
        while True:
            chunk = resp.read(64 * 1024)
            if not chunk:
                break
            f.write(chunk)


def main() -> int:
    download(TFLITE_URL, MODELS_DIR / "yamnet.tflite")
    download(LABELS_URL, LABELS_DIR / "yamnet_class_map.csv")
    print()
    print("Done. Now copy the model into the app:")
    print(f"  cp {MODELS_DIR / 'yamnet.tflite'} ../app/assets/models/yamnet.tflite")
    return 0


if __name__ == "__main__":
    sys.exit(main())
