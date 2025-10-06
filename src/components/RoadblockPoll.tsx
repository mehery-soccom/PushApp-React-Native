import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function RoadblockPoll({ html }: any) {
  return (
    <View style={styles.container}>
      {/* Close Button */}
      {/* <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity> */}

      {/* WebView */}
      <WebView source={{ html }} style={styles.webview} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 20, // optional: margin for modal look
  },
  webview: {
    flex: 1,
    backgroundColor: 'white',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: '#00000080',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
});
