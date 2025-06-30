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
    fetch('http://localhost:3000/api/banner') // update this to your production domain later
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
