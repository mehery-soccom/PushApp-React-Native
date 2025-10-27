# react-native-mehery-event-sender

A lightweight React Native SDK to support push notifications, custom in-app messages (popup, banner, PiP), event tracking, and session handling for your apps.

## Installation

```sh
npm install react-native-mehery-event-sender
```

## 🚀 Initialization

Initialize the SDK in your App.tsx

```js
import { initSdk } from 'react-native-mehery-event-sender';

// ...

initSdk(
  (context = this),
  (identifier = 'demo_1754408042569'),
  (sandbox = true)
);
```

To login the user:

```js
import { onUserLogin } from 'react-native-mehery-event-sender';

// ...

OnUserLogin('user_id');
```

To Initialize Page Open Event

```js
import { OnPageOpen } from 'react-native-mehery-event-sender';

// ...

OnPageOpen('page_name');
```

## 🎯 Event Tracking

To track user actions or custom events:

```js
import { sendCustomEvent } from 'react-native-mehery-event-sender';

// ...
// Send a simple event
sendCustomEvent('login_clicked', { userId: '12345' });

// Send an event with multiple properties
sendCustomEvent('purchase_made', {
  itemId: '987',
  amount: 299,
  currency: 'USD',
});
```

## 🔔 Notification Handling

The SDK auto-registers FCM token and handles push notifications. Ensure you have Firebase configured.

## In-App Notifications

The SDK handles: -- Popup full-screen . -- Banner with inline dismiss. -- PiP small floating view with expand logic to popup.
No integration required from your side. The SDK renders them when triggered.

## 📄 ProGuard

-keep class com.mehery.pushapp.\*_ { _; }

## 🏷️ Versions

Latest Version: 0.0.5 Hosted on npm.

## 💬 Support

Raise issues or feature requests in GitHub Issues

<!-- ## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow. -->

<!-- ## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob) -->

# react-native-mehery-event-sender
