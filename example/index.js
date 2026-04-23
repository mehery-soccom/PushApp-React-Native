import { AppRegistry } from 'react-native';
import { registerFcmBackgroundHandler } from 'react-native-mehery-event-sender';
import App from './src/App';
import { name as appName } from './app.json';

// As early as possible (before AppRegistry) so FCM data messages get the same logging as foreground.
registerFcmBackgroundHandler();

AppRegistry.registerComponent(appName, () => App);
