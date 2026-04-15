# react-native-mehery-event-sender

React Native SDK for push notifications, in-app notifications, polls, and event tracking.

## What your app must add (quick checklist)

Your example/consumer app must include all of the following:

- Firebase config files:
  - Android: `android/app/google-services.json`
  - iOS: `ios/GoogleService-Info.plist`
- Google Services Gradle plugins on Android (`com.google.gms.google-services`)
- `@react-native-firebase/app` + `@react-native-firebase/messaging`
- `@react-native-async-storage/async-storage`
- `react-native-push-notification`
- SDK initialization in app startup (`initSdk`)
- `PollOverlayProvider` mounted once at app root
- iOS background mode for remote notifications (`remote-notification` in `Info.plist`)

## Installation

```sh
npm install react-native-mehery-event-sender
npm install @react-native-firebase/app @react-native-firebase/messaging
npm install @react-native-async-storage/async-storage react-native-push-notification
```

Then for iOS:

```sh
cd ios && pod install
```

## Step-by-step setup for example app

### 1) Add Firebase files

- Place `google-services.json` in `android/app/`
- Place `GoogleService-Info.plist` in your iOS app target

### 2) Android Gradle setup

In `android/build.gradle`, add:

```gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.3.15'
  }
}
```

In `android/app/build.gradle`, add:

```gradle
apply plugin: 'com.google.gms.google-services'
```

### 3) Android manifest permissions

Make sure your app has notification/network permissions in `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### 4) iOS capabilities

In your iOS `Info.plist`, include:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

Also enable Push Notifications capability in Xcode for your app target.

### 5) Initialize SDK in app startup

```tsx
import { useEffect } from 'react';
import { initSdk } from 'react-native-mehery-event-sender';

useEffect(() => {
  // identifier format: "<tenant>_<channel>"
  initSdk(null, 'demo_1754408042569', false);
}, []);
```

### 6) Mount poll overlay once at root

```tsx
import { PollOverlayProvider } from 'react-native-mehery-event-sender';

export default function App() {
  return (
    <>
      {/* your app routes/screens */}
      <PollOverlayProvider />
    </>
  );
}
```

### 7) Link user and page/session events

```tsx
import {
  OnUserLogin,
  OnPageOpen,
  OnAppOpen,
  sendCustomEvent,
} from 'react-native-mehery-event-sender';

OnUserLogin('user_123');
OnAppOpen();
OnPageOpen('home');
sendCustomEvent('login_clicked', { source: 'welcome_screen' });
```

### 8) (Optional) Render in-app poll placeholders

```tsx
import {
  InlinePollContainer,
  TooltipPollContainer,
} from 'react-native-mehery-event-sender';
```

Use:

- `InlinePollContainer` where inline poll cards should render.
- `TooltipPollContainer` around UI elements that should receive tooltip polls.

## Notification payload notes

### Android image keys

- Single image: `image`, `imageUrl`, `image_url`
- Carousel: `imageUrls`, `image_urls`, `carousel_images`, or `image1`, `image2`, ...

### iOS action category example

To show 3 action buttons, send category `THREE_BUTTON_CATEGORY` in APNs payload.
Action IDs received in JS/native tap handling are:

- `PUSHAPP_ACTION_1`
- `PUSHAPP_ACTION_2`
- `PUSHAPP_ACTION_3`

## ProGuard

```pro
-keep class com.mehery.pushapp.** { *; }
```

## Support

Raise issues or feature requests in [GitHub Issues](https://github.com/mehery-soccom/PushApp-React-Native/issues).
