import { NativeModules } from 'react-native';

const { LiveActivityModule } = NativeModules;

export const triggerLiveActivity = (data: Record<string, string>) => {
  console.log('📣 triggerLiveActivity called with data:', data);

  if (LiveActivityModule?.triggerLiveActivity) {
    try {
      LiveActivityModule.triggerLiveActivity(data);
      console.log(
        '✅ LiveActivityModule.triggerLiveActivity executed successfully'
      );
    } catch (error) {
      console.error('❌ Error while calling LiveActivityModule:', error);
    }
  } else {
    console.warn('⚠️ LiveActivityModule is not available on NativeModules');
  }
};
