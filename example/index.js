import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { registerFcmBackgroundHandler } from 'react-native-mehery-event-sender';
import App from './src/App';
import { name as appName } from './app.json';

// As early as possible (before AppRegistry) so FCM data messages get the same logging as foreground.
registerFcmBackgroundHandler();
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  try {
    console.log('🧾 [DBG] Background payload:', JSON.stringify(remoteMessage));
  } catch (error) {
    console.log('🧾 [DBG] Background payload (non-serializable):', error);
    console.log('🧾 [DBG] Background payload object:', remoteMessage);
  }
});

AppRegistry.registerComponent(appName, () => App);
