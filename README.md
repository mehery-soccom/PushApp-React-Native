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

### 3a) Android: one Firebase messaging service (required for background rich notifications)

`@react-native-firebase/messaging` registers `ReactNativeFirebaseMessagingService` with an empty `onMessageReceived`. This SDK provides `com.meheryeventsender.MyFirebaseMessagingService` (subclass) for BigPicture, CTAs, and rich layout. If **both** services stay in the merged manifest, only one may receive FCM, and you can get **no custom images or action buttons in the background**.

Add `xmlns:tools` on the root `<manifest>` if needed, then inside `<application>` **remove** the default RNFB service so only the Mehery service remains:

```xml
<service
    android:name="io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService"
    android:exported="false"
    tools:node="remove" />
```

### 3b) Android: native FCM logs (logcat)

The SDK logs FCM handling at **INFO** from `MyFirebaseMessagingService` (not Debug), so default logcat filters that hide `Log.d` still show them.

```text
# Quote '*:S' on zsh (otherwise the shell treats * as a glob and errors).
adb logcat '*:S' 'MyFirebaseMessagingService:I'
```

Simpler (shows only that tag at Info+; also safe in zsh):

```text
adb logcat -s MyFirebaseMessagingService:I
```

If you see **no** lines tagged `MyFirebaseMessagingService` when a push arrives in the background, **`onMessageReceived` did not run** for that delivery. Common causes: a top-level FCM **`notification`** payload while the app is backgrounded (the OS may show a stock notification and not call your service), or a missing **`tools:node="remove"`** so the wrong `FirebaseMessagingService` handles the message. Use **data-only**, high-priority FCM for Android and confirm the manifest step in **3a**. Also look for `Mehery FCM: onNewToken` after install/token refresh; that proves this service class is active.

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

The third argument selects which **pushapp** host the SDK uses for API and WebSocket calls (`{tenant}.pushapp.…`):

- `false` — production: `pushapp.ai`
- `true` — sandbox: `pushapp.xyz` (default)
- `'development'` — development: `pushapp.in`

```tsx
import { useEffect } from 'react';
import { initSdk } from 'react-native-mehery-event-sender';

useEffect(() => {
  // identifier format: "<tenant>_<channel>"
  initSdk(null, 'demo_1754408042569', false);
  // initSdk(null, 'demo_1754408042569', true);       // sandbox
  // initSdk(null, 'demo_1754408042569', 'development');
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
  updateUserProfile,
} from 'react-native-mehery-event-sender';
```

Call each event where it best matches the user journey:

**a) User login event**

```tsx
// Call after successful sign-in/signup to map this device/session to your user ID
await OnUserLogin('user_123');
```

**b) Profile update**

```tsx
// Call after login when you have customer fields or cohorts to sync.
// Uses `user_id` and channel from storage (set by init + login), PUTs `/v1/customer/profile`.
// The SDK only performs this network update once per install (later calls are skipped).
await updateUserProfile(
  { name: 'Jane Doe', email: 'jane@example.com', city: 'Mumbai' },
  { segment: 'trial', plan: 'free' }
);
```

**c) Page open event**

```tsx
// Call when a screen/page is shown (use your route/screen name)
OnPageOpen('home');
```

**d) Custom event**

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

**e) User logout event**

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

### Android: FCM data-only for rich background notifications

**Foreground** vs **background** use different code paths. When the app is in the **foreground**, JavaScript (`messaging().onMessage`) can show a local notification with big-picture image and CTA actions from the payload. When the app is in the **background** (or not running), **only** the native `FirebaseMessagingService` (`MyFirebaseMessagingService`) can add BigPicture, custom layouts, and `NotificationCompat` actions.

On Android, Firebase will **not** call `onMessageReceived` for messages that use a top-level FCM **`notification`** block while the app is in the background; the system shows a default tray notification instead, which does not include this SDK’s custom images or action buttons. To get rich background notifications, send **data-only** messages: put everything the app needs (title, body, `image` / `imageUrl` / `image_url`, `cta_buttons` or `title1` / `url1`, etc.) as **string** fields in the FCM `data` map, and set **high priority** for the Android message (FCM HTTP v1: e.g. `android.priority: HIGH`) so delivery is not deferred too long under Doze.

If you need a **`notification`** payload for iOS or other platforms, use **per-platform** FCM overrides (e.g. data-only for Android, `notification` + APNs for iOS). The `setBackgroundMessageHandler` in JS does not replace this: it cannot make `onMessageReceived` run when the system does not deliver the message to your service.

**How to verify:** With the app in the background, send a **data-only** test push, then `adb logcat -s MyFirebaseMessagingService:I` (or `adb logcat '*:S' 'MyFirebaseMessagingService:I'`) — you should see `Mehery FCM: onMessageReceived` and `FCM[raw]` / `FCM[merged]` lines. With a `notification` block, the service often will **not** log in background, and the tray will show a basic system notification. Compare with the same content sent as data-only to confirm images and CTA actions.

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
