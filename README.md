# Baby Monitor App

A two-device baby monitor built as a single React Native codebase. The **Child Device** sits near the crib, listens with the microphone, runs an on-device cry-detection model, and when a cry is detected it wakes the **Parent Device** and opens a low-latency, end-to-end-encrypted audio stream so the caregiver can hear the room. The parent can press-and-hold a Talk button to speak back through the Child Device speaker.

This repo contains:

```
Baby Monitor App/
├── BabyMonitorApp_Spec.docx     Project spec & architecture
├── README.md                    This file
├── app/                         React Native app (iOS + Android)
├── server/                      Node + TypeScript signaling backend
├── ml/                          Cry-detection model assets & notes
└── scripts/                     Setup helpers
```

## Quick start

### 1. Signaling server

```bash
cd server
cp .env.example .env
npm install
npm run dev          # starts on :8080
```

The server is fine on a single small VM in dev. It exposes REST routes for auth/pairing/wake and a WebSocket route at `/ws/signal` for SDP/ICE relay.

### 2. React Native app

```bash
cd app
npm install
# Generate the native iOS/Android projects (one-time)
npx react-native-community/cli init BabyMonitorNative --skip-install
# (See app/SETUP.md for full native setup notes.)
npx react-native run-ios
# or
npx react-native run-android
```

Open the app on **two devices**, pick the role on each (Child / Parent), and pair them with a 6-digit code or QR.

### 3. ML model

The cry detector ships with a TFLite build of [YAMNet](https://www.kaggle.com/models/google/yamnet) plus a tiny linear head that collapses YAMNet's 521 classes to `{cry, not_cry}`. See `ml/README.md` for how to download it.

## Architecture (one paragraph)

The two device apps share a single React Native codebase; the role (Child / Parent) is picked on first launch and stored locally. The Child Device runs a foreground audio service that converts a rolling 1.5 s mic buffer to a log-mel spectrogram and runs YAMNet+head every ~1 s. When the smoothed cry probability stays above the user's sensitivity threshold for 3 s, the Child Device asks the backend to send a high-priority push to the Parent Device. The Parent app wakes via PushKit (iOS) or a full-screen intent (Android), and the two devices establish a peer-to-peer WebRTC audio session via the signaling server. Audio is encrypted with DTLS-SRTP and never touches our servers (TURN only relays when symmetric NAT requires it).

## Status

This is a v1 scaffold. The pairing flow, signaling, WebRTC wiring, and the cry-detection pipeline are all implemented in TypeScript end-to-end against documented native modules (`react-native-webrtc`, `react-native-fast-tflite`, `react-native-audio-record`). To actually run on device you need to:

1. Generate the native iOS/Android projects with `react-native init` (or copy them from a fresh template) and re-add the `src/` and `App.tsx` files.
2. Run `pod install` in `ios/`.
3. Add the TFLite model file to `app/assets/models/`.
4. Configure FCM (Android) and APNs (iOS) credentials.

See `app/SETUP.md` for the full native setup checklist.

## License

Proprietary — all rights reserved (placeholder; replace before shipping).
