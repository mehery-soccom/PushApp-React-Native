import { useEffect, useState } from 'react';
import { View, StyleSheet, TextInput, Button, Text } from 'react-native';
import {
  BannerScreen,
  initSdk,
  OnUserLogin,
  OnUserLogOut,
  OnPageClose,
  OnPageOpen,
} from 'react-native-mehery-event-sender';

export default function App() {
  const [userId, setUserId] = useState('');
  const [submittedUserId, setSubmittedUserId] = useState('');

  useEffect(() => {
    initSdk();
  }, []);

  const handleSubmit = () => {
    if (userId.trim()) {
      setSubmittedUserId(userId.trim());
      OnUserLogin(userId);
      // console.log('User ID submitted:', userId);
      // Add your logic to handle user login here
    }
  };
  const handlePageOpen = () => {
    OnPageOpen();
  };
  const handlePageClose = () => {
    OnPageClose();
  };

  const handleLogout = () => {
    if (submittedUserId) {
      OnUserLogOut(userId);
      console.log('User ID logged out:', submittedUserId);
      setSubmittedUserId('');
    } else {
      console.warn('No user is currently logged in.');
    }
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
      <View style={styles.buttonContainer}>
        <Button title="Submit" onPress={handleSubmit} />
        <View style={styles.spacer} />
        <Button title="Logout" onPress={handleLogout} color="red" />
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Open Page" onPress={handlePageOpen} />
        <Button title="Close Page" onPress={handlePageClose} />
      </View>
      {submittedUserId ? (
        <Text style={styles.confirmText}>Logged in as: {submittedUserId}</Text>
      ) : null}
      <BannerScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#888',
    padding: 10,
    borderRadius: 5,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spacer: {
    width: 10,
  },
  confirmText: {
    marginTop: 10,
    fontSize: 16,
    color: 'green',
  },
});
