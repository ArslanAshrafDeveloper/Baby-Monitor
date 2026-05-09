# Cry-detection model

The Child Device runs [YAMNet](https://www.kaggle.com/models/google/yamnet) (a pretrained audio classifier) on-device via TensorFlow Lite. YAMNet outputs scores for 521 audio classes; we only care about a small subset (`Baby cry, infant cry`, `Whimper`, `Wail, moan`).

## Files

```
ml/
├── README.md
├── tools/
│   └── download_yamnet.py     One-shot fetch + TFLite conversion helper
├── models/
│   └── yamnet.tflite          (gitignored; produced by the tool below)
└── labels/
    └── yamnet_class_map.csv   YAMNet's 521 class labels
```

After running the helper, copy `models/yamnet.tflite` into `app/assets/models/yamnet.tflite` so Metro bundles it.

## Get the model

```bash
cd ml
pip install -r tools/requirements.txt
python tools/download_yamnet.py
cp models/yamnet.tflite ../app/assets/models/yamnet.tflite
```

The official TFLite build is ~3.7 MB.

## Cry classes (indexes into YAMNet's class_map)

| Index | Label |
|------:|-------|
|    20 | Baby cry, infant cry |
|    21 | Whimper |
|    22 | Wail, moan |

We take `max(score)` over those three classes as the cry probability — see `app/src/services/audio/cryDetector.ts`.

## Tuning

Sensitivity slider thresholds are defined in `app/src/store/settings.ts`:

```
high   → 0.55
medium → 0.70
low    → 0.85
```

A 3-second sustained-trigger window is enforced in the debouncer. Tune both against your own labeled corpus before shipping; the defaults come from informal testing on YAMNet's own dev set.

## Roadmap

For v1.x we plan to fine-tune a tiny linear head (binary {cry, not_cry}) on top of YAMNet's 1024-d embedding using a curated cry-vs-noise dataset. The runtime contract from the app's perspective is identical: a single probability in `[0,1]`.
