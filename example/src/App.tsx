// App.tsx
import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Button, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initSdk,
  OnUserLogin,
  OnUserLogOut,
  OnPageOpen,
} from 'react-native-mehery-event-sender';
import { PollOverlayProvider } from 'react-native-mehery-event-sender';
import { InlinePollContainer } from 'react-native-mehery-event-sender';
import { TooltipPollContainer } from 'react-native-mehery-event-sender';

function LoginPage({ onLogin }: { onLogin: (id: string) => void }) {
  const [userId, setUserId] = useState('');

  useEffect(() => {
    initSdk();
  }, []);

  const handleSubmit = async () => {
    const trimmedId = userId.trim();
    if (!trimmedId) return;

    await AsyncStorage.setItem('user_id', trimmedId);

    OnUserLogin(trimmedId);
    onLogin(trimmedId); // switch to HomePage
  };

  return (
    <View style={styles.container}>
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
  const handlePageOpen = () => OnPageOpen();

  useEffect(() => {
    try {
      handlePageOpen();
      console.log('page opened');
    } catch (error) {
      console.log('Cut failed', error);
    }
  }, []); // ✅ runs once when HomePage mounts

  return (
    <View style={[styles.container, { justifyContent: 'center' }]}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
        User ID: {userId}
      </Text>
      <Button title="Logout" onPress={onLogout} />
      <TooltipPollContainer placeholderId="center">
        <View></View>
        {/* <Button title="Test Tooltip" /> */}
      </TooltipPollContainer>
      <InlinePollContainer placeholderId="login_banner" />
    </View>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'login' | 'home'>('login');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Initialize SDK once
    initSdk();
    //
    // Run page open event on app launch
    // const timer = setTimeout(() => {}, 100000);
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

  const handleLogin = (id: string) => {
    setUserId(id);
    setCurrentPage('home');
  };

  const handleLogout = async () => {
    if (userId) {
      OnUserLogOut(userId);
      await AsyncStorage.removeItem('user_id');
      setUserId('');
      setCurrentPage('login');
    }
  };

  return (
    <>
      <PollOverlayProvider />
      {currentPage === 'login' ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <HomePage userId={userId} onLogout={handleLogout} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
    marginTop: 300,
  },
  label: { fontSize: 18, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    padding: 10,
    borderRadius: 5,
    marginBottom: 12,
  },
});
