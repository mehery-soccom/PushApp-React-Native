import { useRef, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { hidePollOverlay } from './PollOverlay';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';

export default function RoadblockPoll({
  html,
  onClose,
  messageId,
  filterId,
  pollType, // ✅ added here
  style,
}: {
  html: string;
  onClose?: () => void;
  messageId?: string;
  filterId?: string;
  pollType?: string; // ✅ added here
  style?: string; // ✅ added here
}) {
  const webViewRef = useRef<WebView>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayText, setOverlayText] = useState('');

  console.log('poll type:', pollType);
  console.log('style:', style);

  console.log('📨 messageId:', messageId);
  console.log('📨 filterId:', filterId);
  // console.log('📨 rb html:', html);

  const showOverlay = (text: string) => {
    setOverlayText(text);
    setOverlayVisible(true);
  };

  const hideOverlay = () => {
    setOverlayVisible(false);
    setOverlayText('');
  };
  console.log('overlay visible:', overlayVisible);
  console.log('overlay visible:', overlayText);

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
    const commonHeaders = await buildCommonHeaders();

    try {
      const res = await fetch(
        'https://demo.pushapp.co.in/pushapp/api/v1/notification/in-app/track',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...commonHeaders,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      console.log('✅ Track API response:', data);
    } catch (error) {
      console.error('❌ Track API error:', error);
    }
  };

  const normalizeUrl = (rawUrl?: string) => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const value = rawUrl.trim();
    if (!value) return '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
    if (/^https?:\/\//i.test(value)) return value;
    if (/^www\./i.test(value)) return `https://${value}`;
    return '';
  };

  // 🔹 Handle messages from WebView
  const onMessage = async (event: any) => {
    const raw = event.nativeEvent.data;
    try {
      const message = JSON.parse(raw);
      console.log('📩 Message from WebView:', message);

      switch (message.type) {
        case 'buttonClick': {
          const ctaId = message.ctaId || message.value || '';
          const url = normalizeUrl(message.url || '');
          await sendTrackEvent('cta', ctaId);
          if (url) {
            try {
              await sendTrackEvent('openUrl', url);
              await Linking.openURL(url);
            } catch (err) {
              console.error('❌ Failed to open URL:', err);
            }
          }
          onClose?.() ?? hidePollOverlay();
          break;
        }

        case 'closePoll':
          await sendTrackEvent('dismissed');
          onClose?.() ?? hidePollOverlay();
          break;

        case 'longPress':
          await sendTrackEvent('longPress', message.value);
          showOverlay(message.value);
          setTimeout(hideOverlay, 1500);
          break;

        case 'openUrl': {
          const url = normalizeUrl(message.url || '');
          if (url) {
            try {
              await sendTrackEvent('openUrl', url);
              await Linking.openURL(url);
            } catch (err) {
              console.error('❌ Failed to open URL:', err);
            }
          }
          break;
        }

        default:
          console.log('default case');
        // console.warn('⚠️ Unknown WebView message type:', message);
        // sendTrackEvent('unknown', JSON.stringify(message));
      }
    } catch (err) {
      // console.warn('⚠️ Invalid message from WebView:', raw);
      // sendTrackEvent('unknown', 'invalid_json');
    }
  };

  // 🔹 Inject JS to handle button events inside HTML
  const injectedJS = `
    (function() {
      function init() {
        document.body.style.touchAction = 'manipulation';
        document.body.style.userSelect = 'none';

        const send = (data) => {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        };
        const extractUrl = (el) => {
          const onclickAttr = el.getAttribute('onclick') || '';
          const hrefAttr = el.getAttribute('data-href') || el.getAttribute('href') || '';
          const onClickUrlMatch = onclickAttr.match(/['"]((?:https?:\\/\\/|www\\.)[^'"]+)['"]/i);
          if (onClickUrlMatch && onClickUrlMatch[1]) return onClickUrlMatch[1];
          return hrefAttr || '';
        };

        const attachClickListener = (element) => {
          let pressTimer;

          element.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            let value = this.value || this.innerText || '';
            const targetUrl = extractUrl(this);

            send({ type: 'buttonClick', ctaId: value, url: targetUrl });
          });

          element.addEventListener('touchstart', function() {
            let value = this.innerText || this.value || 'Button';
            pressTimer = setTimeout(() => {
              send({ type: 'longPress', value });
            }, 600);
          });

          ['touchend', 'touchmove', 'touchcancel'].forEach(ev => {
            element.addEventListener(ev, () => clearTimeout(pressTimer));
          });
        };

        document.querySelectorAll('button').forEach(attachClickListener);
        document.querySelectorAll('a[href]').forEach(attachClickListener);

        document.querySelectorAll('[data-close], .close-button, .poll-close, .close-btn')
          .forEach(el => el.addEventListener('click', () => send({ type: 'closePoll' })));
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
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
      {/* <Modal transparent visible={overlayVisible} animationType="fade">
        <Pressable style={styles.overlay} onPress={hideOverlay}>
          <Text style={styles.overlayText}>{overlayText}</Text>
        </Pressable>
      </Modal> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#fff',
    // borderRadius: 12,
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
