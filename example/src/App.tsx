import { View, StyleSheet } from 'react-native';
import { BannerScreen } from 'react-native-mehery-event-sender'; // ✅ Comes from SDK
import * as SDK from 'react-native-mehery-event-sender';
console.log('sdk:', SDK); // should log { BannerScreen: [Function], ... }

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
