import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './src/App';
import { name as appName } from './app.json';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  // Keep RN background bridge alive for analytics/event hooks.
  console.log(
    '📨 Background FCM message received in example app:',
    remoteMessage?.messageId || 'unknown'
  );
});

AppRegistry.registerComponent(appName, () => App);
