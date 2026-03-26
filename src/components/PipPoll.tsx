import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
  PanResponder,
  Animated,
  Image,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';

const { width, height } = Dimensions.get('window');

interface PipPollProps {
  html: string;
  fullscreen?: boolean;
  alignment?: string; // "top-left", "center-right", etc
  messageId?: string;
  filterId?: string;
}

export default function PipPoll({
  html,
  fullscreen,
  alignment,
  messageId,
  filterId,
}: PipPollProps) {
  const [maximized, setMaximized] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;

  // Convert alignment string to initial x/y
  const getInitPos = useCallback((): { x: number; y: number } => {
    const w = width / 3;
    const h = height / 4;
    let x: number, y: number;

    if (alignment) {
      const [vertical, horizontal] = alignment.split('-');

      if (vertical === 'top') y = 10;
      else if (vertical === 'center') y = (height - h) / 2;
      else if (vertical === 'bottom') y = height - h - 10;
      else y = height - h - 10;

      if (horizontal === 'left') x = 10;
      else if (horizontal === 'center') x = (width - w) / 2;
      else if (horizontal === 'right') x = width - w - 10;
      else x = 10;
    } else {
      x = 10;
      y = height - h - 10;
    }

    return { x, y };
  }, [alignment]);

  useEffect(() => {
    pan.setValue(getInitPos());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alignment]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !maximized && !fullscreen,
      onPanResponderGrant: () => {
        const x = (pan.x as any).__getValue();
        const y = (pan.y as any).__getValue();
        pan.setOffset({ x, y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Wrap HTML to ensure responsive video support
  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin:0; padding:0; background:black; }
          video, iframe { max-width:100%; max-height:100%; display:block; margin:auto; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

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

    try {
      await fetch(
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

  // Fullscreen / Maximized Mode
  if (maximized || fullscreen) {
    return (
      <View
        style={{
          width,
          height,
          zIndex: 400,
        }}
      >
        <WebView
          source={{ html: htmlContent }}
          style={styles.web}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          injectedJavaScript={injectedJS}
          onMessage={onMessage}
        />
        <TouchableOpacity
          style={styles.maxBtn}
          onPress={() => setMaximized(false)}
        >
          <Text style={styles.maxBtnText}>X</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const containerStyle = { width: width / 3, height: height / 4 };

  return (
    <Animated.View
      style={[containerStyle, pan.getLayout(), styles.pipContainer]}
      {...(!maximized && !fullscreen ? panResponder.panHandlers : {})}
    >
      <WebView
        source={{ html: htmlContent }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        injectedJavaScript={injectedJS}
        onMessage={onMessage}
      />
      <TouchableOpacity
        style={styles.maxBtnSmall}
        onPress={() => setMaximized(true)}
      >
        <Image
          source={require('../../assets/fullscreen.png')} // 👈 your image file path
          style={styles.maxBtnImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  web: { flex: 1 },
  pipContainer: {
    position: 'absolute',
    zIndex: 400,
    elevation: 5,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  maxBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'black',
    padding: 12,
    borderRadius: 5,
  },
  maxBtnSmall: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'black',
    padding: 6,
    borderRadius: 5,
  },
  maxBtnText: { color: 'white', fontWeight: 'bold' },
  maxBtnImage: {
    width: 20,
    height: 20,
  },
});
