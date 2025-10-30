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

export default function RoadblockPoll({
  html,
  onClose,
  messageId,
  filterId,
}: {
  html: string;
  onClose?: () => void;
  messageId?: string;
  filterId?: string;
}) {
  const webViewRef = useRef<WebView>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayText, setOverlayText] = useState('');

  console.log('📨 messageId:', messageId);
  console.log('📨 filterId:', filterId);

  const showOverlay = (text: string) => {
    setOverlayText(text);
    setOverlayVisible(true);
  };

  const hideOverlay = () => {
    setOverlayVisible(false);
    setOverlayText('');
  };

  // 🔹 Send tracking event to backend
  const sendTrackEvent = async (
    eventType: 'cta' | 'dismissed' | 'longPress' | 'openUrl' | 'unknown',
    ctaId?: string
  ) => {
    const payload = {
      messageId,
      filterId,
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

  // 🔹 Handle messages from WebView
  const onMessage = (event: any) => {
    const raw = event.nativeEvent.data;
    try {
      const message = JSON.parse(raw);
      console.log('📩 Message from WebView:', message);

      switch (message.type) {
        case 'buttonClick':
          sendTrackEvent('cta', message.value);
          onClose?.() ?? hidePollOverlay();
          break;

        case 'closePoll':
          sendTrackEvent('dismissed');
          onClose?.() ?? hidePollOverlay();
          break;

        case 'longPress':
          sendTrackEvent('longPress', message.value);
          showOverlay(message.value);
          setTimeout(hideOverlay, 1500);
          break;

        case 'openUrl':
          sendTrackEvent('openUrl', message.url);
          if (message.url) {
            Linking.openURL(message.url).catch((err) =>
              console.error('❌ Failed to open URL:', err)
            );
          }
          break;

        default:
          console.warn('⚠️ Unknown WebView message type:', message);
          sendTrackEvent('unknown', JSON.stringify(message));
      }
    } catch (err) {
      console.warn('⚠️ Invalid message from WebView:', raw);
      sendTrackEvent('unknown', 'invalid_json');
    }
  };

  // 🔹 Inject JS to handle button events inside HTML
  const injectedJS = `
    (function() {
      document.body.style.touchAction = 'manipulation';
      document.body.style.userSelect = 'none';

      const send = (data) => {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      };

      document.querySelectorAll('button').forEach(btn => {
        let pressTimer;

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();

          let value = this.value || this.innerText || '';
          let targetUrl = '';

          const onclickAttr = this.getAttribute('onclick');
          const hrefAttr = this.getAttribute('data-href') || this.getAttribute('href');

          if (onclickAttr) {
            const urlMatch = onclickAttr.match(/'(https?:[^']+)'/);
            if (urlMatch) targetUrl = urlMatch[1];
          } else if (hrefAttr) {
            targetUrl = hrefAttr;
          }

          send({ type: 'buttonClick', value });
          if (targetUrl) send({ type: 'openUrl', url: targetUrl });
        });

        btn.addEventListener('touchstart', function() {
          let value = this.innerText || this.value || 'Button';
          pressTimer = setTimeout(() => {
            send({ type: 'longPress', value });
          }, 600);
        });

        ['touchend', 'touchmove', 'touchcancel'].forEach(ev => {
          btn.addEventListener(ev, () => clearTimeout(pressTimer));
        });
      });

      document.querySelectorAll('[data-close], .close-button, .poll-close, .close-btn')
        .forEach(el => el.addEventListener('click', () => send({ type: 'closePoll' })));
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

      {/* Long press overlay */}
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
