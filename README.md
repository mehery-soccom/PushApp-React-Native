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
  OnUserLogOut,
  OnPageOpen,
  sendCustomEvent,
} from 'react-native-mehery-event-sender';
```

Call each event where it best matches the user journey:

**a) User login event**

```tsx
// Call after successful sign-in/signup to map this device/session to your user ID
await OnUserLogin('user_123');
```

**b) Page open event**

```tsx
// Call when a screen/page is shown (use your route/screen name)
OnPageOpen('home');
```

**c) Custom event**

```tsx
// Call for user actions you want to track with extra metadata.
// You can send any custom keys that match your analytics/business needs.
sendCustomEvent('login_clicked', {
  source: 'welcome_screen',
  method: 'google',
  campaign_id: 'spring_launch_2026', // custom key
  button_variant: 'primary', // custom key
  plan_type: 'trial', // custom key
});
```

**d) User logout event**

```tsx
// Call before/after clearing local auth state when user signs out
await OnUserLogOut('user_123');
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

### Example app: iOS notification extensions (reference)

The `example/ios` project ships with native targets you can use as a starting point when wiring push, rich notifications, and Live Activities. Copy or adapt the Swift, plists, and assets into your own app; **branding and UI design are yours**—these paths only show where the hooks and data live.

| Area | Path |
| --- | --- |
| Rich notification UI (content extension) | `example/ios/ImagePreviewExtension/NotificationViewController.swift` (and `MainInterface.storyboard`, `Assets.xcassets` in the same folder) |
| Modify notification content before display (service extension) | `example/ios/ImageServiceExtension/NotificationService.swift` |
| Live Activity / delivery-style widget data and UI | `example/ios/DeliveryActivity/` (Swift sources, `Info.plist`, `Assets.xcassets`) |

Mirror the same targets and capabilities in Xcode on your app if you are not using the example workspace directly.

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
