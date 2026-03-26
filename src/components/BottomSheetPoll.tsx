import { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  PanResponder,
  Linking,
  TouchableOpacity,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';

const { height } = Dimensions.get('window');

interface BottomSheetPollProps {
  html: string;
  onClose?: () => void;
  pollType?: string;
  messageId?: string;
  filterId?: string;
}

export default function BottomSheetPoll({
  html,
  onClose,
  messageId,
  filterId,
}: BottomSheetPollProps) {
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(onClose);
  };

  // ✅ Updated sendTrackEvent using your version
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

  const handleDismiss = async () => {
    await sendTrackEvent('dismissed');
    handleClose();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 15,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100) handleDismiss();
        else
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
      },
    })
  ).current;

  const injectedJS = `
    (function() {
      function initListeners() {
        const send = (data) => window.ReactNativeWebView.postMessage(JSON.stringify(data));
        const extractUrl = (el) => {
          const onclickAttr = el.getAttribute('onclick') || '';
          const hrefAttr = el.getAttribute('data-href') || el.getAttribute('href') || '';
          const onClickUrlMatch = onclickAttr.match(/['"]((?:https?:\\/\\/|www\\.)[^'"]+)['"]/i);
          if (onClickUrlMatch && onClickUrlMatch[1]) return onClickUrlMatch[1];
          return hrefAttr || '';
        };

        const attachClickListener = (element) => {
          element.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            let value = this.innerText || this.value || '';
            const targetUrl = extractUrl(this);

            send({ type: 'buttonClick', ctaId: value, url: targetUrl });
          });
        };

        document.querySelectorAll('button').forEach(attachClickListener);
        document.querySelectorAll('a[href]').forEach(attachClickListener);

        document.querySelectorAll('[data-close], .poll-close, .close-btn').forEach(el =>
          el.addEventListener('click', () => send({ type: 'closePoll' }))
        );
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initListeners);
      } else {
        initListeners();
      }
    })();
  `;

  const onMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'buttonClick':
        case 'cta': {
          const ctaId = msg.ctaId || msg.value || '';
          const url = normalizeUrl(msg.url || msg.value || '');
          await sendTrackEvent('cta', ctaId);
          if (url) {
            try {
              await sendTrackEvent('openUrl', url);
              await Linking.openURL(url);
            } catch (err) {
              console.error('❌ Failed to open URL:', err);
            }
          }
          handleClose();
          break;
        }

        case 'closePoll':
          await sendTrackEvent('dismissed');
          handleClose();
          break;

        case 'openUrl':
        case 'link': {
          const url = normalizeUrl(msg.url);
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
          await sendTrackEvent('unknown', JSON.stringify(msg));
          break;
      }
    } catch (error) {
      await sendTrackEvent('unknown', 'invalid_json');
    }
  };

  return (
    <Animated.View
      style={[styles.sheet, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        injectedJavaScript={injectedJS}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        onMessage={onMessage}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: height * 0.5,
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
