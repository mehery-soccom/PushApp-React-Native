import {
  requireNativeComponent,
  UIManager,
  Platform,
  type ViewStyle,
} from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-mehery-event-sender' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

type MeheryEventSenderProps = {
  color: string;
  style: ViewStyle;
};

const ComponentName = 'MeheryEventSenderView';

export const MeheryEventSenderView =
  UIManager.getViewManagerConfig(ComponentName) != null
    ? requireNativeComponent<MeheryEventSenderProps>(ComponentName)
    : () => {
        throw new Error(LINKING_ERROR);
      };

type UserDetails = {
  [key: string]: string;
};
let storedUserDetails: UserDetails | null = null;

export function logUserDetails(details: UserDetails) {
  console.log('User Details:');
  Object.entries(details).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  // Save it internally
  storedUserDetails = details;
}

export function getLoggedUserDetails(): UserDetails | null {
  return storedUserDetails;
}
