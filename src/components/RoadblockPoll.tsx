import { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { hidePollOverlay } from './PollOverlay';

export default function RoadblockPoll({ html, onClose }: any) {
  const webViewRef = useRef<WebView>(null);

  const sendTrackEvent = async (
    eventType: 'cta' | 'dismissed',
    ctaId?: string
  ) => {
    const payload = { event: eventType, data: ctaId ? { ctaId } : {} };
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

  const onMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'buttonClick') {
        console.log('🖱️ Button clicked with value:', message.value);
        sendTrackEvent('cta', message.value);
        if (onClose) onClose();
        else hidePollOverlay();
      } else if (message.type === 'closePoll') {
        console.log('🚪 Close poll message received');
        sendTrackEvent('dismissed');
        if (onClose) onClose();
        else hidePollOverlay();
      }
    } catch (err) {
      console.warn('⚠️ Invalid message from WebView', event.nativeEvent.data);
    }
  };

  const injectedJS = `
    (function() {
      // Enable clicks
      document.body.style.touchAction = 'manipulation';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.userSelect = 'none';
      
      // Attach button click listeners
      document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
          const value = this.value || this.innerText || '';
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buttonClick', value }));
        });
      });

      // Close poll buttons
      document.querySelectorAll('[data-close], .close-button, .poll-close').forEach(el => {
        el.addEventListener('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'closePoll' }));
        });
      });

      // Prevent scroll blocking
      window.addEventListener('touchmove', function(e) { e.stopPropagation(); }, { passive: true });
    })();
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        onMessage={onMessage}
        injectedJavaScript={injectedJS}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        allowsAirPlayForMediaPlayback
        allowsBackForwardNavigationGestures
        automaticallyAdjustContentInsets
        androidLayerType="hardware"
        mixedContentMode="always"
        userAgent="Mozilla/5.0 (ReactNativeWebView)"
        scrollEnabled={true}
        nestedScrollEnabled={true}
        startInLoadingState={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
