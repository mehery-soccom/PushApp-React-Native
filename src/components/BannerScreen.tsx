import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { getDeviceId } from '../utils/device';
import { CustomBanner } from './CustomBanner';

type BannerProps = {
  backgroundColor: string;
  headerText: string;
  subText: string;
  name?: string;
};

export const BannerScreen: React.FC = () => {
  const [bannerData, setBannerData] = useState<BannerProps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDeviceId().then((id) => console.log('✅ Device ID:', id));
  }, []);

  useEffect(() => {
    fetch('https://templatemaker-2.onrender.com/api/banner')
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
