import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerScreen } from 'react-native-mehery-event-sender'; // ✅ Comes from SDK

export default function App() {
  return (
    <View style={styles.container}>
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
});
