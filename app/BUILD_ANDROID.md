# Building an Android APK

This guide takes you from a clean repo to a signed `.apk` you can install on a phone or upload to the Play Console. If you just want CI to build it for you, see `.github/workflows/android.yml` instead.

## 1. Prerequisites

Install on your machine:

| Tool | Version | Notes |
|------|---------|------|
| JDK | 17 (Temurin) | RN 0.74 requires Java 17. Anything older breaks Gradle. |
| Node.js | 18.18+ or 20.x | Same as React Native's docs. |
| Android Studio | Iguana or newer | We only use it for the SDK Manager — actual builds run from the CLI. |
| Android SDK | Platform 34, Build-tools 34.0.0 | Open Android Studio → SDK Manager → install. |
| Android NDK | 26.1.10909125 | Required by `react-native-webrtc` and `react-native-fast-tflite`. |
| `ANDROID_HOME` env var | `~/Library/Android/sdk` (mac) or `%LOCALAPPDATA%\Android\Sdk` (Win) | Add it and `$ANDROID_HOME/platform-tools` to your `PATH`. |

Verify:

```bash
java -version       # 17.x.x
node --version      # >=18.18
adb --version
```

## 2. Generate the native Android project

The repo doesn't ship a committed `android/` folder because it's regenerable and tied to your local SDK paths. One-time:

```bash
cd <repo-root>
npx @react-native-community/cli init BabyMonitorNative \
  --version 0.74.3 \
  --skip-install \
  --skip-git-init \
  --directory app-tmp

mv app-tmp/android app/android
rm -rf app-tmp
```

Discard the `App.tsx`, `index.js`, `package.json` from the template if they slipped through — the ones already in `app/` are the real ones.

## 3. Wire the manifest and permissions

Open `app/android/app/src/main/AndroidManifest.xml` and merge in:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
  <uses-permission android:name="android.permission.WAKE_LOCK" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

  <!-- Battery whitelist prompt; required so OEMs don't kill our service. -->
  <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

  <application
    android:label="@string/app_name"
    android:icon="@mipmap/ic_launcher"
    android:allowBackup="false"
    android:usesCleartextTraffic="true"  <!-- only for dev signaling on http://; remove for release. -->
    android:theme="@style/AppTheme">

    <activity
      android:name=".MainActivity"
      android:exported="true"
      android:launchMode="singleTask"
      android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode"
      android:windowSoftInputMode="adjustResize"
      android:showWhenLocked="true"
      android:turnScreenOn="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
      </intent-filter>
    </activity>

    <!-- Foreground service that owns the cry-detection loop. -->
    <service
      android:name="com.voziv.foregroundservice.ForegroundService"
      android:foregroundServiceType="microphone"
      android:exported="false" />

  </application>
</manifest>
```

> The `usesCleartextTraffic="true"` line is only for talking to a `http://` signaling server during development. For a release build you should host the server behind HTTPS and remove this attribute (or replace it with a `network_security_config.xml` that whitelists only your dev IP).

## 4. Make Gradle pick up the native libs

Open `app/android/build.gradle` and set:

```groovy
buildscript {
    ext {
        buildToolsVersion = "34.0.0"
        minSdkVersion = 24            // react-native-webrtc requires 24+
        compileSdkVersion = 34
        targetSdkVersion = 34
        ndkVersion = "26.1.10909125"
        kotlinVersion = "1.9.22"
    }
    // ...
}
```

In `app/android/app/build.gradle` add at the top of the `android { … }` block:

```groovy
android {
    // ...
    packagingOptions {
        pickFirst '**/libc++_shared.so'
        pickFirst '**/libjsc.so'
    }
    // Keep release builds small by splitting per-ABI.
    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
            universalApk false
        }
    }
}
```

## 5. Add the YAMNet model file

```bash
cd ml
pip install -r tools/requirements.txt
python tools/download_yamnet.py
mkdir -p ../app/assets/models
cp models/yamnet.tflite ../app/assets/models/yamnet.tflite
```

Metro will pick it up because `metro.config.js` already lists `tflite` as an asset extension. The detector also has a fallback heuristic, but real cry detection only works when this file is bundled.

## 6. Build a debug APK

From the repo root:

```bash
cd app
npm install
cd android
./gradlew clean
./gradlew assembleDebug
```

The APK lands at:

```
app/android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected device (USB debugging on, plugged in):

```bash
adb install -r app-debug.apk
```

Or build + install in one step:

```bash
cd app
npx react-native run-android --variant=debug
```

For debug builds Metro must be running in another terminal:

```bash
npm start
```

## 7. Build a signed release APK

### 7a. Generate a keystore (one-time)

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore baby-monitor-release.keystore \
  -alias baby-monitor \
  -keyalg RSA -keysize 2048 -validity 10000
```

Keep this file out of git. You'll be prompted for a store password and a key password — remember both.

Move the keystore to `app/android/app/baby-monitor-release.keystore`.

### 7b. Reference it from Gradle

Add to `app/android/gradle.properties` (or, better, `~/.gradle/gradle.properties` so passwords aren't in the repo):

```properties
BABY_MONITOR_RELEASE_STORE_FILE=baby-monitor-release.keystore
BABY_MONITOR_RELEASE_KEY_ALIAS=baby-monitor
BABY_MONITOR_RELEASE_STORE_PASSWORD=<store password>
BABY_MONITOR_RELEASE_KEY_PASSWORD=<key password>
```

Then in `app/android/app/build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            if (project.hasProperty('BABY_MONITOR_RELEASE_STORE_FILE')) {
                storeFile file(BABY_MONITOR_RELEASE_STORE_FILE)
                storePassword BABY_MONITOR_RELEASE_STORE_PASSWORD
                keyAlias BABY_MONITOR_RELEASE_KEY_ALIAS
                keyPassword BABY_MONITOR_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro"
        }
    }
}
```

### 7c. ProGuard rules for the native libs

Append to `app/android/app/proguard-rules.pro`:

```
# react-native-webrtc
-keep class org.webrtc.** { *; }
-keep interface org.webrtc.** { *; }
-dontwarn org.webrtc.**

# react-native-fast-tflite
-keep class com.mrousavy.tflite.** { *; }
-keep class org.tensorflow.lite.** { *; }
-dontwarn org.tensorflow.lite.**

# react-native (general)
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-dontwarn com.facebook.react.**

# OkHttp / Okio (used by signaling client)
-dontwarn okio.**
-dontwarn okhttp3.**
```

### 7d. Build it

```bash
cd app/android
./gradlew clean
./gradlew assembleRelease
```

Per-ABI APKs land at:

```
app/android/app/build/outputs/apk/release/
  app-arm64-v8a-release.apk      <- ship this for almost every modern phone
  app-armeabi-v7a-release.apk
  app-x86-release.apk
  app-x86_64-release.apk
```

For the Play Store you generally want an AAB instead:

```bash
./gradlew bundleRelease
# -> app/android/app/build/outputs/bundle/release/app-release.aab
```

## 8. Sanity check on a device

```bash
adb install -r app-arm64-v8a-release.apk
adb shell am start -n com.babymonitor/.MainActivity
adb logcat -s ReactNativeJS:V cry:V signal:V rtc:V
```

You should see:

```
I/ReactNativeJS: [INFO] [cry] detector started
I/ReactNativeJS: [INFO] [signal] open
```

## 9. Common build failures

| Symptom | Fix |
|---------|-----|
| `Could not determine java version from '21.x'` | Switch to JDK 17 (`brew install --cask temurin@17` and `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`). |
| `No matching client found for package name` | Add a real `google-services.json` from Firebase, or remove the FCM messaging dependency from `package.json` if you're not using it yet. |
| `Execution failed for task ':app:mergeReleaseNativeLibs'` complaining about `libc++_shared.so` | Add the `pickFirst` lines from Step 4. |
| Foreground service crashes on Android 14 with "missing FOREGROUND_SERVICE_MICROPHONE" | Re-check Step 3 — both the permission AND the `<service ... android:foregroundServiceType="microphone">` are required. |
| App installs but the mic doesn't capture | The user denied `RECORD_AUDIO`. Send them to Settings → Apps → Baby Monitor → Permissions. |

## 10. Size budget

A release per-ABI APK with YAMNet bundled and ProGuard on should land around **18–22 MB**:

- React Native runtime: ~7 MB
- Hermes: ~3 MB
- WebRTC native: ~6 MB
- TFLite + YAMNet model: ~4 MB
- App JS bundle: ~1–2 MB

If yours is much bigger, double-check that:

- `splits.abi` is on (otherwise you ship four ABIs in one APK).
- `minifyEnabled true` is on for release.
- The model file isn't accidentally committed twice (under `app/assets/models/` AND `ml/models/`).
