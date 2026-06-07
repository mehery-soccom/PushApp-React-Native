// App.tsx
import { useEffect, useState } from 'react';
import messaging from '@react-native-firebase/messaging';
import {
  View,
  StyleSheet,
  TextInput,
  Button,
  Text,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initSdk,
  OnUserLogin,
  OnUserLogOut,
  OnPageOpen,
  OnAppOpen,
  updateUserProfile,
  sendCustomEvent,
  triggerCarouselNotification,
  type SdkInitEnvironmentParam,
} from 'react-native-mehery-event-sender';
import { PollOverlayProvider } from 'react-native-mehery-event-sender';
import { InlinePollContainer } from 'react-native-mehery-event-sender';
import { TooltipPollContainer } from 'react-native-mehery-event-sender';

import DeviceInfo from 'react-native-device-info';
import { setDeviceMetadata, setGeoIP } from 'react-native-mehery-event-sender';

// Server expects name/phones/email at top level; custom + commerce keys in additionalInfo.
// Do not use cohorts for channel demo_1780031354415 — cohorts in PUT returns HTTP 500.
// Mandatory dashboard field "<h1>ajejik</h2>" → additionalInfo._h1_ajejik_h2_
const CHANNEL_REQUIRED_FIELDS = {
  _h1_ajejik_h2_: 'static',
};

const STATIC_IDENTITY = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phones: ['+919876543210'],
};

const STATIC_COMMERCE = {
  lifetime_order_count: 12,
  customer_segment: 'existing' as 'new' | 'existing',
  days_since_last_order: 5,
  active_store_tag: 'mumbai_central',
  delivery_pincode: '400012',
  cart_value: 2499,
};

function buildProfilePayload(nameOverride?: string, userId?: string) {
  const name = nameOverride?.trim() || STATIC_IDENTITY.name;
  const phoneSuffix = (userId ?? '0000')
    .replace(/\D/g, '')
    .slice(-4)
    .padStart(4, '0');
  return {
    ...CHANNEL_REQUIRED_FIELDS,
    ...STATIC_COMMERCE,
    name,
    email: STATIC_IDENTITY.email,
    phones: [`+9198765${phoneSuffix}`],
  };
}

function LoginPage({ onLogin }: { onLogin: (id: string) => void }) {
  const [userId, setUserId] = useState('');

  const handleSubmit = async () => {
    const trimmedId = userId.trim();
    if (!trimmedId) return;

    await AsyncStorage.setItem('user_id', trimmedId);
    onLogin(trimmedId); // switch to HomePage
  };

  return (
    <View style={styles.container}>
      <View style={styles.customEventButtons}>
        <Button
          title="Pre-login event 1"
          onPress={() => {
            sendCustomEvent('pre_login_button_1', { screen: 'login' });
          }}
        />
        <View style={styles.customEventButtonSpacer} />
        <Button
          title="Pre-login event 2"
          onPress={() => {
            sendCustomEvent('pre_login_button_2', { screen: 'login' });
          }}
        />
      </View>
      <View style={styles.preLoginFormSpacer} />
      <Text style={styles.label}>Enter User ID:</Text>
      <TextInput
        style={styles.input}
        placeholder="user123"
        value={userId}
        onChangeText={setUserId}
      />
      <Button title="Submit" onPress={handleSubmit} />
    </View>
  );
}
function HomePage({
  userId,
  onLogout,
}: {
  userId: string;
  onLogout: () => void;
}) {
  const [profileName, setProfileName] = useState('');
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bootstrapHome = async () => {
      try {
        await OnUserLogin(userId);
        console.log('OnUserLogin called', userId);
        OnAppOpen();
        OnPageOpen('home');

        if (cancelled) return;

        setProfileStatus('Updating profile on home load…');
        const result = await updateUserProfile(
          buildProfilePayload(undefined, userId)
        );
        if (cancelled) return;

        setProfileStatus(
          result.skipped
            ? `Home profile sync — skipped. ${result.message}`
            : `Home profile sync — sent. ${result.message}`
        );
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setProfileStatus(`Home profile sync failed: ${message}`);
        console.log('error in opening page:', error);
      }
    };

    bootstrapHome();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleUpdateProfile = async () => {
    setProfileStatus('Updating profile…');
    try {
      const result = await updateUserProfile(
        buildProfilePayload(profileName, userId)
      );
      setProfileStatus(
        result.skipped
          ? `updateUserProfile finished — skipped. ${result.message}`
          : `updateUserProfile finished — sent. ${result.message}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setProfileStatus(`Profile update failed: ${message}`);
      console.warn('[Example] updateUserProfile error', err);
    }
  };

  return (
    <View style={styles.container}>
      <InlinePollContainer placeholderId="login_banner" />

      <Text style={styles.txt}>User ID: {userId}</Text>

      <View style={styles.profileSection}>
        <Text style={styles.label}>Profile name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Jane Doe"
          value={profileName}
          onChangeText={setProfileName}
          autoCapitalize="words"
        />
        <Button title="Update profile" onPress={handleUpdateProfile} />
        <Text style={styles.profileHint}>
          Home load sends additionalInfo: name, email, phones, _h1_ajejik_h2_,
          lifetime_order_count, customer_segment, days_since_last_order,
          active_store_tag, delivery_pincode, cart_value. Tap Update to override
          name only.
        </Text>
        <Text style={styles.profileHint}>
          This is not profile code profile code won't change once logged in
          because that will be the contact id for that device.
        </Text>
        {profileStatus ? (
          <Text style={styles.profileStatus}>{profileStatus}</Text>
        ) : null}
      </View>
      <View style={styles.customEventButtons}>
        <Button
          title="Button 1"
          onPress={() => {
            sendCustomEvent('button 1 clicked', { screen: 'home' });
          }}
        />
        <View style={styles.customEventButtonSpacer} />
        <Button
          title="Button 2"
          onPress={() => {
            sendCustomEvent('button 2 clicked', { screen: 'home' });
          }}
        />
      </View>
      <View style={styles.customEventButtonSpacer} />
      {Platform.OS === 'android' && (
        <>
          {/* <Button
            title="Test carousel notification"
            onPress={async () => {
              await triggerCarouselNotification({
                title: 'Summer Sale',
                body: 'Tap Prev / Next to browse',
                images: [
                  'https://picsum.photos/seed/a/600/300',
                  'https://picsum.photos/seed/b/600/300',
                  'https://picsum.photos/seed/c/600/300',
                ],
              });
            }}
          /> */}
          <View style={styles.customEventButtonSpacer} />
        </>
      )}
      <Button title="Logout" onPress={onLogout} />
      <View style={styles.ve}>
        <TooltipPollContainer placeholderId="center">
          <View style={styles.vex} />
          {/* <Button title="+" /> */}
        </TooltipPollContainer>
      </View>
    </View>
  );
}

// import React, { useState, useEffect } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { PollOverlayProvider } from './PollOverlayProvider';
// import LoginPage from './LoginPage';
// import HomePage from './HomePage';
async function initDeviceMetadata() {
  try {
    const metadata: Record<string, string> = {
      'X-Device-Model': DeviceInfo.getModel?.() || 'unknown',
      'X-System-Name': DeviceInfo.getSystemName?.() || 'unknown',
      'X-OS-Version': DeviceInfo.getSystemVersion?.() || 'unknown',
    };

    // 🔹 Android-only
    if (Platform.OS === 'android') {
      metadata['X-Manufacturer'] =
        (await DeviceInfo.getManufacturer()) || 'unknown';

      metadata['X-API-Level'] =
        String(await DeviceInfo.getApiLevel()) || 'unknown';

      metadata['X-CPU-ABI'] =
        (await DeviceInfo.supportedAbis()).join(', ') || 'unknown';
    }

    // 🔹 iOS-only
    if (Platform.OS === 'ios') {
      metadata['X-Device-Name'] =
        (await DeviceInfo.getDeviceName()) || 'unknown';
    }

    setDeviceMetadata(metadata);
  } catch (err) {
    console.warn('[App] Failed to init device metadata', err);
  }
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'login' | 'home'>('login');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      // 1️⃣ Inject device metadata FIRST
      await initDeviceMetadata();

      // Example geoIP (host app should set from location / geo-IP service before register/login)
      setGeoIP({
        ip: '103.21.244.0',
        location: { lat: 19.076, lng: 72.8777 },
        country: { iso_code: 'IN', name: 'India' },
        region: { iso_code: 'MH', name: 'Maharashtra' },
        city: { name: 'Mumbai' },
        area: { name: 'Parel' },
      });

      // 2️⃣ Initialize SDK (3rd arg: false=pushapp.ai, true=pushapp.xyz, 'development'=pushapp.in)

      // let environment: SdkInitEnvironmentParam = 'development';
      // await initSdk(null, 'demo_1754408042569', environment);
      // console.log('SDK initialized with environment:', environment);
      //prod
      let environment: SdkInitEnvironmentParam = 'development';
      await initSdk(null, 'demo_1780031354415', false);
      console.log('SDK initialized with environment:', 'false');
      // 3️⃣ Log FCM Token
      try {
        await messaging().requestPermission();
        const token = await messaging().getToken();
        console.log('Firebase Cloud Messaging Token:', token);
      } catch (error) {
        console.warn('Failed to get FCM token', error);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const checkStoredUser = async () => {
      const storedId = await AsyncStorage.getItem('user_id');
      if (storedId) {
        setUserId(storedId);
        setCurrentPage('home');
      }
    };
    checkStoredUser();
  }, []);

  const handleLogin = async (id: string) => {
    setUserId(id);
    await AsyncStorage.setItem('user_id', id);
    setCurrentPage('home');
  };

  const handleLogout = async () => {
    if (!userId) return;
    await OnUserLogOut(userId);
    await AsyncStorage.removeItem('user_id');
    setUserId('');
    setCurrentPage('login');
  };

  return (
    <>
      {currentPage === 'login' ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <HomePage userId={userId} onLogout={handleLogout} />
      )}
      <PollOverlayProvider />
    </>
  );
}

const styles = StyleSheet.create({
  ve: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vex: {
    width: 50,
    height: 50,
    backgroundColor: 'blue',
    borderRadius: 50,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
    marginTop: 150,
    justifyContent: 'center',
  },
  label: { fontSize: 18, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    padding: 10,
    borderRadius: 5,
    marginBottom: 12,
  },
  txt: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  customEventButtons: {
    marginTop: 16,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  customEventButtonSpacer: { height: 12 },
  preLoginFormSpacer: { height: 28 },
  profileSection: {
    marginTop: 20,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  profileHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  profileStatus: {
    marginTop: 10,
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
});
