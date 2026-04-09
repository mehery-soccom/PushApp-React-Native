import { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Linking,
  Pressable,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Video from 'react-native-video';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { getApiBaseUrl } from '../helpers/tenantContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloaterProps {
  html?: string;
  videoUrl?: string;
  position?: 'top' | 'center' | 'bottom';
  horizontalAlign?: 'left' | 'center' | 'right';
  width?: number;
  height?: number;
  messageId?: string;
  filterId?: string;
  onClose?: () => void;
}

export default function Floater({
  html,
  videoUrl,
  position = 'bottom',
  horizontalAlign = 'center',
  width = 130,
  height = 130,
  messageId,
  filterId,
  onClose,
}: FloaterProps) {
  // ✅ Compute initial position based on alignment
  const initialTop =
    position === 'top'
      ? 50
      : position === 'center'
        ? (screenHeight - height) / 2
        : screenHeight - height - 80;

  const initialLeft =
    horizontalAlign === 'left'
      ? 12
      : horizontalAlign === 'right'
        ? screenWidth - width - 12
        : (screenWidth - width) / 2;

  const pan = useRef(
    new Animated.ValueXY({ x: initialLeft, y: initialTop })
  ).current;
  const positionRef = useRef({ x: initialLeft, y: initialTop }); // ✅ persistent tracker

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
      onPanResponderMove: (_, gesture) => {
        const newX = positionRef.current.x + gesture.dx;
        const newY = positionRef.current.y + gesture.dy;

        pan.setValue({ x: newX, y: newY });
      },
      onPanResponderRelease: (_, gesture) => {
        let newX = positionRef.current.x + gesture.dx;
        let newY = positionRef.current.y + gesture.dy;

        // ✅ Clamp to screen bounds
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + width > screenWidth) newX = screenWidth - width;
        if (newY + height > screenHeight) newY = screenHeight - height;

        positionRef.current = { x: newX, y: newY };

        Animated.spring(pan, {
          toValue: { x: newX, y: newY },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  // 🧹 Reset on unmount
  useEffect(() => {
    return () => {
      pan.setValue({ x: initialLeft, y: initialTop });
      positionRef.current = { x: initialLeft, y: initialTop };
    };
  }, [pan, initialLeft, initialTop]);

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
    const commonHeaders = await buildCommonHeaders();
    const apiBaseUrl = await getApiBaseUrl();

    try {
      await fetch(`${apiBaseUrl}/v1/notification/in-app/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...commonHeaders,
        },
        body: JSON.stringify(payload),
      });
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
            const ctaId = this.value || this.innerText || '';
            const url = extractUrl(this);
            send({ type: 'buttonClick', ctaId, url });
          });
        };

        document.querySelectorAll('button').forEach(attachClickListener);
        document.querySelectorAll('a[href]').forEach(attachClickListener);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initListeners);
      } else {
        initListeners();
      }
    })();
    true;
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
          break;
        }
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
      }
    } catch (error) {
      await sendTrackEvent('unknown', 'invalid_json');
    }
  };

  const handleOverlayClose = () => {
    sendTrackEvent('dismissed').catch(() => {});
    onClose?.();
  };

  return (
    <Pressable style={styles.overlay} onPress={handleOverlayClose}>
      <Animated.View
        style={[
          styles.container,
          {
            width,
            height,
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
        onStartShouldSetResponder={() => true}
        {...panResponder.panHandlers}
      >
        {videoUrl ? (
          <Video
            source={{ uri: videoUrl }}
            style={styles.video}
            resizeMode="contain"
            controls
            paused={false}
            repeat={false}
            ignoreSilentSwitch="ignore"
          />
        ) : (
          <WebView
            source={{ html: html || '' }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            scrollEnabled={false}
            injectedJavaScript={injectedJS}
            onMessage={onMessage}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
    zIndex: 9998,
    backgroundColor: 'transparent',
  },
  container: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
  },
  webview: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
