import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Text,
  Pressable,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { hidePollOverlay } from './PollOverlay';

export default function RoadblockPoll({ html, onClose }: any) {
  const webViewRef = useRef<WebView>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayText, setOverlayText] = useState('');

  const showOverlay = (text: string) => {
    setOverlayText(text);
    setOverlayVisible(true);
  };

  const hideOverlay = () => {
    setOverlayVisible(false);
    setOverlayText('');
  };

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
      console.log('📩 Message from WebView:', message);

      switch (message.type) {
        case 'buttonClick':
          console.log('🖱️ Button clicked:', message.value);
          sendTrackEvent('cta', message.value);
          onClose ? onClose() : hidePollOverlay();
          break;

        case 'closePoll':
          console.log('🚪 Poll closed');
          sendTrackEvent('dismissed');
          onClose ? onClose() : hidePollOverlay();
          break;

        case 'longPress':
          showOverlay(message.value);
          setTimeout(hideOverlay, 1500);
          break;

        case 'openUrl':
          if (message.url) {
            console.log('🌐 Opening URL externally:', message.url);
            Linking.openURL(message.url).catch((err) =>
              console.error('❌ Failed to open URL:', err)
            );
          }
          break;

        default:
          console.warn('⚠️ Unknown WebView message type:', message);
      }
    } catch (err) {
      console.warn('⚠️ Invalid message from WebView', event.nativeEvent.data);
    }
  };
  const injectedJS = `
  (function() {
    document.body.style.touchAction = 'manipulation';
    document.body.style.userSelect = 'none';
  
    document.querySelectorAll('button').forEach(btn => {
      let pressTimer;
  
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
  
        let value = this.value || this.innerText || '';
        let targetUrl = '';
  
        const onclickAttr = this.getAttribute('onclick');
        const hrefAttr = this.getAttribute('data-href') || this.getAttribute('href');
  
        if (onclickAttr) {
          const match = onclickAttr.match(/'(https?:[^']+)'/);
          if (match && match[1]) targetUrl = match[1];
          const valMatch = onclickAttr.match(/'([^']+)'\\s*\\)$/);
          if (valMatch && valMatch[1]) value = valMatch[1];
        } else if (hrefAttr) {
          targetUrl = hrefAttr;
        }
  
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buttonClick', value }));
  
        if (targetUrl) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openUrl', url: targetUrl }));
        }
      });
  
      btn.addEventListener('touchstart', function() {
        let value = this.innerText || this.value || 'Button';
        pressTimer = setTimeout(() => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'longPress', value }));
        }, 600);
      });
  
      btn.addEventListener('touchend', function() {
        clearTimeout(pressTimer);
      });
  
      btn.addEventListener('touchmove', function() {
        clearTimeout(pressTimer);
      });
    });
  
    document.querySelectorAll('[data-close], .close-button, .poll-close, .close-btn').forEach(el => {
      el.addEventListener('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'closePoll' }));
      });
    });
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
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        userAgent="Mozilla/5.0 (ReactNativeWebView)"
      />

      {/* Fullscreen overlay */}
      <Modal transparent visible={overlayVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={hideOverlay}>
          <Text style={styles.overlayText}>{overlayText}</Text>
        </Pressable>
      </Modal>
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 28,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '600',
  },
});
