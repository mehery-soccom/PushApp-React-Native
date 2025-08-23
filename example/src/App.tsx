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
  // const handlePageClose = () => OnPageClose();

  return (
    <View style={[styles.container, { justifyContent: 'center' }]}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>
        User ID: {userId}
      </Text>
      <Button title="click to do event" onPress={handlePageOpen} />

      <Button title="Logout" onPress={onLogout} />
    </View>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'login' | 'home'>('login');
  const [userId, setUserId] = useState<string>('');

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
