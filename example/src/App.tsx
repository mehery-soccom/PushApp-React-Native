import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Button, Text } from 'react-native';
import {
  MeheryEventSenderView,
  logUserDetails,
  getLoggedUserDetails,
} from 'react-native-mehery-event-sender';

export default function App() {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [fetchedDetails, setFetchedDetails] = useState<any>(null);

  const handleSend = () => {
    logUserDetails({ name, number, email });
  };

  const handleShowDetails = () => {
    const data = getLoggedUserDetails();
    setFetchedDetails(data);
  };

  return (
    <View style={styles.container}>
      <MeheryEventSenderView color="#32a852" style={styles.box} />
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="Phone Number"
        value={number}
        onChangeText={setNumber}
        keyboardType="phone-pad"
        style={styles.input}
      />
      <TextInput
        placeholder="Email ID"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        style={styles.input}
      />
      <Button title="Send Details" onPress={handleSend} />
      <View style={{ marginTop: 20 }}>
        <Button title="Show Logged Details" onPress={handleShowDetails} />
        {fetchedDetails && (
          <View style={{ marginTop: 10 }}>
            <Text>Name: {fetchedDetails.name}</Text>
            <Text>Phone: {fetchedDetails.number}</Text>
            <Text>Email: {fetchedDetails.email}</Text>
          </View>
        )}
      </View>
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
  box: {
    width: 60,
    height: 60,
    alignSelf: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 8,
    padding: 10,
    borderRadius: 8,
  },
});
