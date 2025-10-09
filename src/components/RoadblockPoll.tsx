import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function RoadblockPoll({ html }: any) {
  const webViewRef = useRef<WebView>(null);

  // 🔹 Function to send tracking event
  const sendTrackEvent = async (
    eventType: 'cta' | 'dismissed',
    ctaId?: string
  ) => {
    const payload = {
      event: eventType,
      data: ctaId ? { ctaId } : {},
    };

    console.log('📤 Sending track event:', payload);

    try {
      const res = await fetch(
        'https://demo.pushapp.co.in/pushapp/api/v1/notification/in-app/track',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      console.log('✅ Track API response:', data);
    } catch (error) {
      console.error('❌ Track API error:', error);
    }
  };

  // 🔹 Handle messages sent from inside the WebView
  const onMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'buttonClick') {
        console.log('🖱️ Button clicked with value:', message.value);
        sendTrackEvent('cta', message.value);
      }
    } catch (err) {
      console.warn('⚠️ Invalid message from WebView', event.nativeEvent.data);
    }
  };

  // 🔹 Inject JS to capture button clicks inside HTML
  const injectedJS = `
  (function() {
    // Listen for button clicks
    document.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', function() {
        const value = this.value || this.innerText || '';
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buttonClick', value }));
      });
    });

    // Listen for "close" actions inside HTML
    document.querySelectorAll('[data-close], .close-button, .poll-close').forEach(el => {
      el.addEventListener('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'closePoll' }));
      });
    });
  })();
`;

  // // 🔹 Handle close
  // const handleClose = () => {
  //   console.log('🚪 Roadblock closed');
  //   sendTrackEvent('dismissed');
  //   if (onClose) onClose();
  // };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        onMessage={onMessage}
        injectedJavaScript={injectedJS}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    margin: 20,
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
