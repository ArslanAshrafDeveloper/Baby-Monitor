# App setup

The TypeScript / JS source for the React Native app lives in this folder, but the native iOS and Android projects (the Xcode workspace and the `android/` Gradle module) are not committed — they are large, regenerable, and tied to the React Native CLI version on your machine. You generate them once and then point them at the existing `src/` and `App.tsx`.

## 1. Install JS deps

```bash
cd app
npm install
```

## 2. Generate native projects (one-time)

```bash
# from the repo root
npx @react-native-community/cli init BabyMonitorNative \
  --version 0.74.3 \
  --skip-install \
  --skip-git-init \
  --directory app-tmp
```

Then move the generated native folders into this app folder:

```bash
mv app-tmp/ios   app/ios
mv app-tmp/android app/android
rm -rf app-tmp
```

The generated template will also have its own `App.tsx`, `index.js`, and `package.json` — discard those (we already have them here).

## 3. iOS

```bash
cd app/ios
pod install
cd ..
npx react-native run-ios
```

Add to `Info.plist`:

- `NSMicrophoneUsageDescription` — "Baby Monitor needs the microphone to listen for your baby's cries."
- `UIBackgroundModes` → `audio`, `voip`
- enable Push Notifications + Background Modes capability in Xcode

For VoIP push (wake-on-cry), follow the README of [`react-native-voip-push-notification`](https://github.com/react-native-webrtc/react-native-voip-push-notification) — it requires `PushKit` and a `CallKit` provider configuration.

## 4. Android

```bash
cd app
npx react-native run-android
```

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.INTERNET" />
```

Configure FCM (`google-services.json` in `android/app/`) following the standard Firebase guide.

For the foreground service that keeps the cry detector alive while the screen is off, use [`react-native-foreground-service`](https://github.com/Voziv/react-native-foreground-service) and start it from `ChildListeningScreen` after the detector starts.

## 5. ML model

```bash
cd ../ml
pip install -r tools/requirements.txt
python tools/download_yamnet.py
mkdir -p ../app/assets/models
cp models/yamnet.tflite ../app/assets/models/yamnet.tflite
```

The detector falls back to a heuristic if the model file is missing, so you can run the app end-to-end before you bundle the model — but real cry detection will only work with the .tflite in place.

## 6. Server URL

Point `app/src/services/api.ts` (`API_BASE`) at your signaling server:

- iOS simulator: `http://localhost:8080`
- Android emulator: `http://10.0.2.2:8080`
- Physical devices on the same Wi-Fi: `http://<your-laptop-ip>:8080`
- Production: `https://signal.yourdomain.com`

## 7. Run on two devices

1. Start the server (`cd server && npm run dev`).
2. Run the app on Device A → choose **Parent Device** → a 6-digit code appears.
3. Run the app on Device B → choose **Child Device** → enter the code.
4. On Device B (Child), leave the app open near the baby. On Device A (Parent), tap **Test call** to verify the audio path before relying on cry detection.
