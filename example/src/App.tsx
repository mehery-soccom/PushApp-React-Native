import { useEffect, useState } from 'react';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initSdk,
  OnUserLogOut,
  setGeoIP,
  PollOverlayProvider,
  type SdkInitEnvironmentParam,
} from 'react-native-mehery-event-sender';
import { LoginScreen } from './screens/LoginScreen';
import { PostLoginShell } from './screens/PostLoginShell';
import {
  clearCommerceStorage,
  setProfileName,
  setRegistrationCompleted,
} from './utils/cartStorage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [sdkReady, setSdkReady] = useState(false);
  const [pendingAuthEvent, setPendingAuthEvent] = useState<
    'signIn' | 'signUp' | null
  >(null);

  useEffect(() => {
    const init = async () => {
      setGeoIP({
        ip: '103.21.244.0',
        location: { lat: 19.076, lng: 72.8777 },
        country: { iso_code: 'IN', name: 'India' },
        region: { iso_code: 'MH', name: 'Maharashtra' },
        city: { name: 'Mumbai' },
        area: { name: 'Parel' },
      });

      const environment: SdkInitEnvironmentParam = 'development';
      await initSdk(null, 'demo_1754408042569', environment);
      console.log('SDK initialized with environment:', environment);
      setSdkReady(true);

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
    if (!sdkReady) return;

    const checkStoredUser = async () => {
      const storedId = await AsyncStorage.getItem('user_id');
      if (storedId) {
        setUserId(storedId);
        setIsLoggedIn(true);
      }
    };
    checkStoredUser();
  }, [sdkReady]);

  const enterPostLogin = (id: string) => {
    setUserId(id);
    setIsLoggedIn(true);
  };

  const handleSignIn = async (code: string) => {
    setPendingAuthEvent('signIn');
    enterPostLogin(code);
  };

  const handleSignUp = async (code: string, name: string) => {
    await setProfileName(name);
    await setRegistrationCompleted(1);
    setPendingAuthEvent('signUp');
    enterPostLogin(code);
  };

  const handleLogout = async () => {
    if (!userId) return;
    await OnUserLogOut(userId);
    await AsyncStorage.removeItem('user_id');
    await clearCommerceStorage();
    setUserId('');
    setIsLoggedIn(false);
  };

  return (
    <>
      {!isLoggedIn ? (
        <LoginScreen onSignIn={handleSignIn} onSignUp={handleSignUp} />
      ) : (
        <PostLoginShell
          userId={userId}
          pendingAuthEvent={pendingAuthEvent}
          onAuthEventSent={() => setPendingAuthEvent(null)}
          onLogout={handleLogout}
        />
      )}
      <PollOverlayProvider />
    </>
  );
}
