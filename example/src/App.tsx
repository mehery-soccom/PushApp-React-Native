import { View, StyleSheet } from 'react-native';
import { BannerScreen, initSdk } from 'react-native-mehery-event-sender';
import * as SDK from 'react-native-mehery-event-sender';
import { useEffect } from 'react';

console.log('sdk:', SDK); // should log { BannerScreen: [Function], ... }

export default function App() {
  useEffect(() => {
    initSdk();
  }, []);
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
