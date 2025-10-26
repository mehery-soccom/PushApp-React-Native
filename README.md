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

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)

# react-native-mehery-event-sender
