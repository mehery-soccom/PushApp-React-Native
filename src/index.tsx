import {
  requireNativeComponent,
  UIManager,
  Platform,
  type ViewStyle,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

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

// ===============================
let cachedDeviceId: string | null = null;
const DEVICE_ID_KEY = 'mehery_device_id';

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      console.log('📦 Loaded existing Device ID:', stored);
      cachedDeviceId = stored;
      return stored;
    }

    const newId = `-mehery-${uuid.v4()}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    console.log('🎉 New Device ID generated and stored:', newId);
    cachedDeviceId = newId;
    return newId;
  } catch (error) {
    console.error('❌ Error accessing AsyncStorage for device ID:', error);
    return 'unknown-device';
  }
}

type UserDetails = {
  [key: string]: string;
};

let storedUserDetails: UserDetails | null = null;

export function logUserDetails(details: UserDetails) {
  console.log('User Details:');
  Object.entries(details).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  storedUserDetails = details;
}

export function getLoggedUserDetails(): UserDetails | null {
  return storedUserDetails;
}

type BannerProps = {
  backgroundColor: string;
  headerText: string;
  subText: string;
  name?: string;
};

export const CustomBanner: React.FC<BannerProps> = ({
  backgroundColor,
  headerText,
  subText,
  name,
}) => {
  console.log('bg:', backgroundColor);
  return (
    <View style={[styles.bannerContainer, { backgroundColor }]}>
      {name && <Text style={styles.name}>{name}</Text>}
      <Text style={styles.header}>{headerText}</Text>
      <Text style={styles.subText}>{subText}</Text>
    </View>
  );
};

// ✅ THIS is the only component the app should use
export const BannerScreen: React.FC = () => {
  const [bannerData, setBannerData] = useState<BannerProps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up device ID and FCM only once
    getDeviceId().then((id) => console.log('✅ Device ID:', id));
  }, []);

  useEffect(() => {
    fetch('https://templatemaker-2.onrender.com/api/banner') // update this to your production domain later
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const latest = data.sort((a, b) => b.index - a.index)[0];
          setBannerData({
            backgroundColor: latest.backgroundColor,
            headerText: latest.titleText,
            subText: latest.subText,
            name: latest.name,
          });
        }
      })
      .catch((err) => console.error('Failed to fetch banner:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;
  if (!bannerData)
    return (
      <Text style={{ textAlign: 'center', marginTop: 50 }}>
        No Banner Found
      </Text>
    );

  return <CustomBanner {...bannerData} />;
};

const styles = StyleSheet.create({
  bannerContainer: {
    width: '100%',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 2,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
  },
  subText: {
    fontSize: 14,
    color: 'red',
    marginTop: 5,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ccc',
    marginBottom: 5,
  },
});
