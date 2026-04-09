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
import { getApiBaseUrl } from '../helpers/tenantContext';

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
  const boldFixStyles = `
    <style>
      strong, b { font-weight: 700 !important; }
      [style*="font-weight:bold"], [style*="font-weight: bold"] { font-weight: 700 !important; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
        -webkit-text-size-adjust: 100% !important;
      }
      * { box-sizing: border-box; }
      img, video, iframe, table, canvas, svg {
        max-width: 100% !important;
        height: auto !important;
      }
    </style>
  `;
  const viewportMeta = `
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
    />
  `;
  const htmlWithBoldFix = /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, `${viewportMeta}${boldFixStyles}</head>`)
    : `${viewportMeta}${boldFixStyles}${html}`;

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
    const apiBaseUrl = await getApiBaseUrl();

    try {
      const res = await fetch(`${apiBaseUrl}/v1/notification/in-app/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...commonHeaders,
        },
        body: JSON.stringify(payload),
      });

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
        source={{ html: htmlWithBoldFix }}
        style={styles.webview}
        injectedJavaScript={injectedJS}
        injectedJavaScriptBeforeContentLoaded="true;"
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        scalesPageToFit={false}
        scrollEnabled={false}
        onMessage={onMessage}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: height * 0.56,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 14,
    zIndex: 1000,
    backgroundColor: 'rgba(17,24,39,0.08)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { fontSize: 15, color: 'white', fontWeight: '700' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
