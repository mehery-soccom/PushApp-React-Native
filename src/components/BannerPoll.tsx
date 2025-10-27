// import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function BannerPoll({ html }: any) {
  // const [visible, setVisible] = useState(true);

  // if (!visible) return null;
  // console.log('html:', html);
  return (
    <View style={styles.container}>
      {/* Close button on top */}
      {/* <TouchableOpacity
        style={styles.closeButton}
        onPress={() => setVisible(false)}
      >
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity> */}

      {/* WebView */}
      <WebView
        source={{ html }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false} // keep scrolling disabled
        onMessage={(event) => {
          const data = event.nativeEvent.data;
          console.log('Message from WebView:', data);
          // handle button clicks from HTML here
        }}
        injectedJavaScript={`
          document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
              window.ReactNativeWebView.postMessage(btn.id || 'clicked');
            });
          });
        `}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    width: '120%',
    height: 75,
    zIndex: 9999,
    backgroundColor: 'white',
  },
  webview: {
    flex: 1,
    backgroundColor: 'white',
  },
  closeButton: {
    position: 'absolute',
    top: 5,
    right: 15,
    zIndex: 99999,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});
