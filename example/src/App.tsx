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
  OnPageOpen,
  OnAppOpen,
  updateUserProfile,
  sendCustomEvent,
  type SdkInitEnvironmentParam,
} from 'react-native-mehery-event-sender';
import { PollOverlayProvider } from 'react-native-mehery-event-sender';
import { InlinePollContainer } from 'react-native-mehery-event-sender';
import { TooltipPollContainer } from 'react-native-mehery-event-sender';

import DeviceInfo from 'react-native-device-info';
import { setDeviceMetadata } from 'react-native-mehery-event-sender';

const toSeconds = (ms: number) => Math.floor(ms / 1000);

const randomExpiryTimestampMoreThan5Years = () => {
  const now = Date.now();
  const fiveYearsMs = 1000 * 60 * 60 * 24 * 365 * 5;
  return toSeconds(now + fiveYearsMs);
};

const randomGender = () => {
  const genders = ['male', 'female'];
  return genders[Math.floor(Math.random() * genders.length)];
};

function LoginPage({ onLogin }: { onLogin: (id: string) => void }) {
  const [userId, setUserId] = useState('');

  const handleSubmit = async () => {
    const trimmedId = userId.trim();
    if (!trimmedId) return;

    await AsyncStorage.setItem('user_id', trimmedId);

    OnUserLogin(trimmedId);
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
  // onLogout,
}: {
  userId: string;
  // onLogout: () => void;
}) {
  // const handlePageOpen = () => OnPageOpen();

  useEffect(() => {
    try {
      OnAppOpen();
      OnPageOpen('login');

      // 🔥 SEND RANDOM PROFILE UPDATE
      updateUserProfile({
        expiry_date: randomExpiryTimestampMoreThan5Years(),
        gender: randomGender(),
      });
    } catch (error) {
      console.log('error in opening page:', error);
    }
  }, []); // ✅ runs once when HomePage mounts

  return (
    <View style={styles.container}>
      <InlinePollContainer placeholderId="login_banner" />

      <Text style={styles.txt}>User ID: {userId}</Text>
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
      {/* <Button title="Logout" onPress={onLogout} /> */}
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

      // 2️⃣ Initialize SDK (3rd arg: false=pushapp.ai, true=pushapp.xyz, 'development'=pushapp.in)

      let environment: SdkInitEnvironmentParam = 'development';
      await initSdk(null, 'demo_1754408042569', environment);
      console.log('SDK initialized with environment:', environment);
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

  // const handleLogout = async () => {
  //   if (userId) {
  //     // OnUserLogOut(userId); // call SDK logout if needed
  //     await AsyncStorage.removeItem('user_id');
  //     setUserId('');
  //     setCurrentPage('login');
  //   }
  // };

  return (
    <>
      {currentPage === 'login' ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <HomePage userId={userId} />
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
});
