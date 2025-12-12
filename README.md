

````md
# react-native-mehery-event-sender

A lightweight React Native SDK to support push notifications, custom in-app messages (popup, banner, PiP), event tracking, in-app polls, and session handling for your apps.

## Installation

```sh
npm install react-native-mehery-event-sender
```
````

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

### Login the user

```js
import { OnUserLogin } from 'react-native-mehery-event-sender';

// ...

OnUserLogin('user_id');
```

### Initialize Page Open Event

```js
import { OnPageOpen } from 'react-native-mehery-event-sender';

// ...

OnPageOpen('page_name');
```

---

## 🎯 Event Tracking

To track user actions or custom events:

```js
import { sendCustomEvent } from 'react-native-mehery-event-sender';
// Send a simple event
sendCustomEvent('login_clicked', { userId: '12345' });

// Send an event with multiple properties
sendCustomEvent('purchase_made', {
  itemId: '987',
  amount: 299,
  currency: 'USD',
});
```

---

## 🔔 Notification Handling

The SDK auto-registers FCM token and handles push notifications.
Ensure you have Firebase configured.

---

## 🧩 In-App Polls (Inline & Tooltip)

The SDK supports inline polls (banners/cards inside screen layout) and tooltip-style polls that attach to UI elements.
These require **no UI logic** from your side — they automatically render when triggered.

### 📌 Inline Poll Container

Render polls inline within your layout:

```tsx
import { InlinePollContainer } from 'react-native-mehery-event-sender';

export default function ExampleScreen() {
  return (
    <View style={{ marginTop: 20 }}>
      <InlinePollContainer placeholderId="home_banner" />
      <Text>Welcome to the Home Screen</Text>
    </View>
  );
}
```

### 📌 Tooltip Poll Container

Attach polls to any UI element (icon, button, floating element):

```tsx
import { TooltipPollContainer } from 'react-native-mehery-event-sender';

export default function ExampleScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <TooltipPollContainer placeholderId="floating_tooltip">
        <View
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'blue',
            borderRadius: 20,
          }}
        />
      </TooltipPollContainer>
    </View>
  );
}
```

---

## 📣 In-App Notifications

The SDK handles:

- Full-screen popup
- Banner with inline dismiss
- PiP floating widget with expand-to-popup

No integration required — rendered automatically when triggered.

---

## 📄 ProGuard

```
-keep class com.mehery.pushapp.** { *; }
```

---

## 🏷️ Versions

Latest Version: **0.0.10** hosted on npm.

---

## 💬 Support

Raise issues or feature requests in **GitHub Issues**.

```

---

If you want, I can also generate:

✅ A cleaned-up npm-optimized README
✅ A version with images/screenshots
✅ A version with API docs & TypeScript definitions

Just tell me!
```
