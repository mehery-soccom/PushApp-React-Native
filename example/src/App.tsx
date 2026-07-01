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
  ScrollView,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initSdk,
  OnUserLogin,
  OnUserLogOut,
  OnPageOpen,
  updateUserProfile,
  sendCustomEvent,
  type SdkInitEnvironmentParam,
} from 'react-native-mehery-event-sender';
import { PollOverlayProvider } from 'react-native-mehery-event-sender';
import { InlinePollContainer } from 'react-native-mehery-event-sender';
import { TooltipPollContainer } from 'react-native-mehery-event-sender';

import DeviceInfo from 'react-native-device-info';
import { setDeviceMetadata, setGeoIP } from 'react-native-mehery-event-sender';
import { EVENT_NAMES } from './constants/events';
import {
  buildProfilePayload,
  clearCommerceStorage,
  getProfileName,
  setProfileName,
  setRegistrationCompleted,
} from './utils/cartStorage';
import { CartSection } from './components/CartSection';
import { EventTester } from './components/EventTester';

function LoginPage({
  onSignIn,
  onSignUp,
}: {
  onSignIn: (code: string) => Promise<void>;
  onSignUp: (code: string, name: string) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode || loading) return;

    setLoading(true);
    try {
      await onSignIn(trimmedCode);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpPress = () => {
    setShowNameInput(true);
    setNameError(null);
  };

  const handleSignUp = async () => {
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (!trimmedCode || loading) return;

    if (!trimmedName) {
      setNameError('Name is required for Sign Up');
      setShowNameInput(true);
      return;
    }

    setNameError(null);
    setLoading(true);
    try {
      await onSignUp(trimmedCode, trimmedName);
    } finally {
      setLoading(false);
    }
  };

  const handlePreLoginButton = async (eventName: string) => {
    if (loading) return;
    await sendCustomEvent(eventName, {});
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Enter code:</Text>
      <TextInput
        style={styles.input}
        placeholder="user123"
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
      />

      {showNameInput ? (
        <>
          <Text style={styles.label}>Your name (Sign Up):</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Jane Doe"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (text.trim()) setNameError(null);
            }}
            autoCapitalize="words"
          />
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        </>
      ) : null}

      <View style={styles.customEventButtons}>
        <Button
          title={loading ? 'Signing in…' : 'Sign In'}
          onPress={handleSignIn}
          disabled={loading}
        />
        <View style={styles.customEventButtonSpacer} />
        {!showNameInput ? (
          <Button
            title="Sign Up"
            onPress={handleSignUpPress}
            disabled={loading}
          />
        ) : (
          <Button
            title={loading ? 'Signing up…' : 'Complete Sign Up'}
            onPress={handleSignUp}
            disabled={loading}
          />
        )}
        <View style={styles.customEventButtonSpacer} />
        <Button
          title="jr_pre_login_button_1"
          onPress={() => handlePreLoginButton(EVENT_NAMES.preLoginButton1)}
          disabled={loading}
        />
        <View style={styles.customEventButtonSpacer} />
        <Button
          title="jr_pre_login_button_2"
          onPress={() => handlePreLoginButton(EVENT_NAMES.preLoginButton2)}
          disabled={loading}
        />
      </View>
    </View>
  );
}

async function loadPushTokens(): Promise<{
  apnsToken: string;
  fcmToken: string;
}> {
  const [storedApns, storedFcm] = await AsyncStorage.multiGet([
    'APNStoken',
    'fcmToken',
  ]).then((entries) => entries.map(([, value]) => value ?? ''));

  let fcmToken = storedFcm;
  try {
    const liveFcm = await messaging().getToken();
    if (liveFcm) {
      fcmToken = liveFcm;
    }
  } catch (error) {
    console.warn('[Example] Failed to read FCM token', error);
  }

  return {
    apnsToken: Platform.OS === 'ios' ? (storedApns ?? '') : '',
    fcmToken: fcmToken ?? '',
  };
}

function HomePage({
  userId,
  onLogout,
}: {
  userId: string;
  onLogout: () => void;
}) {
  const [storedName, setStoredName] = useState('');
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [apnsToken, setApnsToken] = useState('');
  const [fcmToken, setFcmToken] = useState('');
  const [tokensLoading, setTokensLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const { PushTokenManager } = NativeModules;
    let pushSubscription: { remove: () => void } | null = null;

    const refreshTokens = async () => {
      const tokens = await loadPushTokens();
      if (cancelled) return;
      setApnsToken(tokens.apnsToken);
      setFcmToken(tokens.fcmToken);
      setTokensLoading(false);
    };

    refreshTokens();

    if (Platform.OS === 'ios' && PushTokenManager) {
      const pushEmitter = new NativeEventEmitter(PushTokenManager);
      pushSubscription = pushEmitter.addListener(
        'PushTokenEvent',
        ({ type, token }: { type: string; token: string }) => {
          if (type === 'apns') {
            setApnsToken(token);
          } else if (type === 'fcm') {
            setFcmToken(token);
          }
          setTokensLoading(false);
        }
      );
    }

    const pollInterval = setInterval(refreshTokens, 1500);
    const stopPolling = setTimeout(() => clearInterval(pollInterval), 15000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      clearTimeout(stopPolling);
      pushSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapHome = async () => {
      try {
        await OnUserLogin(userId);
        OnPageOpen('home');

        if (cancelled) return;

        const name = await getProfileName();
        if (!cancelled) setStoredName(name);

        setProfileStatus('Updating profile on home load…');
        const result = await updateUserProfile(await buildProfilePayload());
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <InlinePollContainer placeholderId="login_banner" />

      <Text style={styles.txt}>User ID: {userId}</Text>

      <CartSection onProfileSync={setProfileStatus} />

      <EventTester />

      <View style={styles.tokenSection}>
        <Text style={styles.label}>Push tokens</Text>
        <Text style={styles.tokenHint}>
          Tap a field, select all, then copy. Values refresh for ~15s after
          login.
        </Text>

        {Platform.OS === 'ios' ? (
          <>
            <Text style={styles.tokenLabel}>APNS token</Text>
            <TextInput
              style={styles.tokenInput}
              value={
                tokensLoading && !apnsToken
                  ? 'Waiting for APNS token…'
                  : apnsToken || 'APNS token not available'
              }
              editable={false}
              multiline
              selectTextOnFocus
            />
          </>
        ) : (
          <Text style={styles.tokenHint}>APNS token: N/A on Android</Text>
        )}

        <Text style={styles.tokenLabel}>FCM token</Text>
        <TextInput
          style={styles.tokenInput}
          value={
            tokensLoading && !fcmToken
              ? 'Waiting for FCM token…'
              : fcmToken || 'FCM token not available'
          }
          editable={false}
          multiline
          selectTextOnFocus
        />
      </View>

      <View style={styles.profileSection}>
        <Text style={styles.label}>Profile</Text>
        <Text style={styles.profileHint}>
          Name: {storedName.trim() ? storedName : 'No name set'}
        </Text>
        <Text style={styles.profileHint}>
          Profile syncs automatically on home load and after Place Order with
          registration_completed, total_orders, and latest-cart-value.
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
        <View style={styles.customEventButtonSpacer} />
      )}
      <Button title="Logout" onPress={onLogout} />
      <View style={styles.ve}>
        <TooltipPollContainer placeholderId="center">
          <View style={styles.vex} />
        </TooltipPollContainer>
      </View>
    </ScrollView>
  );
}

async function initDeviceMetadata() {
  try {
    const metadata: Record<string, string> = {
      'X-Device-Model': DeviceInfo.getModel?.() || 'unknown',
      'X-System-Name': DeviceInfo.getSystemName?.() || 'unknown',
      'X-OS-Version': DeviceInfo.getSystemVersion?.() || 'unknown',
    };

    if (Platform.OS === 'android') {
      metadata['X-Manufacturer'] =
        (await DeviceInfo.getManufacturer()) || 'unknown';

      metadata['X-API-Level'] =
        String(await DeviceInfo.getApiLevel()) || 'unknown';

      metadata['X-CPU-ABI'] =
        (await DeviceInfo.supportedAbis()).join(', ') || 'unknown';
    }

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
      await initDeviceMetadata();

      setGeoIP({
        ip: '103.21.244.0',
        location: { lat: 19.076, lng: 72.8777 },
        country: { iso_code: 'IN', name: 'India' },
        region: { iso_code: 'MH', name: 'Maharashtra' },
        city: { name: 'Mumbai' },
        area: { name: 'Parel' },
      });

      // let environment: SdkInitEnvironmentParam = 'development';
      // await initSdk(null, 'demo_1754408042569', environment);
      // console.log('SDK initialized with environment:', environment);
      let environment: SdkInitEnvironmentParam = false;
      await initSdk(null, 'demo_1780031354415', environment);
      console.log('SDK initialized with environment:', environment);
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

  const navigateHome = (id: string) => {
    setUserId(id);
    setCurrentPage('home');
  };

  const handleSignIn = async (code: string) => {
    await AsyncStorage.setItem('user_id', code);
    sendCustomEvent(EVENT_NAMES.logIn, { code });
    navigateHome(code);
  };

  const handleSignUp = async (code: string, name: string) => {
    await AsyncStorage.setItem('user_id', code);
    await setProfileName(name);
    sendCustomEvent(EVENT_NAMES.signUp, { code, name });
    await setRegistrationCompleted(1);
    navigateHome(code);
  };

  const handleLogout = async () => {
    if (!userId) return;
    await OnUserLogOut(userId);
    await AsyncStorage.removeItem('user_id');
    await clearCommerceStorage();
    setUserId('');
    setCurrentPage('login');
  };

  return (
    <>
      {currentPage === 'login' ? (
        <LoginPage onSignIn={handleSignIn} onSignUp={handleSignUp} />
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
  scroll: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 150,
    paddingBottom: 40,
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
  errorText: {
    color: '#c00',
    fontSize: 13,
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
  tokenSection: {
    marginTop: 16,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
    color: '#222',
  },
  tokenHint: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 4,
  },
  tokenInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 72,
    textAlignVertical: 'top',
  },
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
