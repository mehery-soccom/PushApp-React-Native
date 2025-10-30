import { useRef, useEffect } from 'react';
import {
  View,
  PanResponder,
  Animated,
  Dimensions,
  StyleSheet,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { height } = Dimensions.get('window');

interface BottomSheetPollProps {
  html: string;
  visible: boolean;
  onClose: () => void;
}

export default function BottomSheetPoll({
  html,
  visible,
  onClose,
  messageId,
  filterId,
}: BottomSheetPollProps) {
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : height,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  console.log('📨 messageId at BS:', messageId);
  console.log('📨 filterId at bs:', filterId);
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100) {
          Animated.timing(translateY, {
            toValue: height,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            sendTrackEvent('dismissed');
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
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

  // 🔹 JS injected into WebView
  const injectedJS = `
    (function() {
      // Attach button click listeners inside #media-container
      document.querySelectorAll('#media-container button').forEach(btn => {
        btn.addEventListener('click', function() {
          let value = this.value || this.innerText || '';

          const onclickAttr = this.getAttribute('onclick');
          if (onclickAttr) {
            const match = onclickAttr.match(/'([^']+)'\\s*\\)$/);
            if (match && match[1]) value = match[1];
          }

          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buttonClick', value }));
        });
      });

      // Attach close listeners
      document.querySelectorAll('[data-close], .close-button, .poll-close, .close-btn')
        .forEach(el => {
          el.addEventListener('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'closePoll' }));
          });
        });
    })();
  `;

  const injectedHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          html, body {
            margin: 0; padding: 0; width: 100%; height: 100%;
            overflow: hidden; background-color: transparent;
          }
          #media-container {
            width: 100%; height: 100%;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center;
            background-color: #fff;
          }
          #media-container img, #media-container video {
            width: 100%; max-height: 100%; object-fit: cover;
          }
          #media-container button {
            padding: 12px 24px; font-size: 16px;
            margin-top: 10px; cursor: pointer;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <div id="media-container">${html}</div>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.bottomSheet, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <WebView
          originWhitelist={['*']}
          source={{ html: injectedHtml }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          injectedJavaScript={injectedJS}
          onMessage={async (event) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);

              if (message.type === 'buttonClick') {
                console.log('🖱️ BottomSheet button clicked:', message.value);
                sendTrackEvent('cta', message.value);

                // ✅ If button value looks like a link, open it
                const value = message.value?.trim();
                if (value && /^(https?:\/\/|www\\.)/i.test(value)) {
                  const url = value.startsWith('http')
                    ? value
                    : `https://${value}`;
                  console.log('🌐 Opening CTA link:', url);
                  await Linking.openURL(url);
                }
              } else if (message.type === 'closePoll') {
                console.log('🚪 BottomSheet close requested');
                sendTrackEvent('dismissed');
              }
            } catch (err) {
              console.warn(
                '⚠️ Invalid message from WebView:',
                event.nativeEvent.data
              );
            }
            onClose();
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1040,
  },
  bottomSheet: {
    height: height * 0.5,
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  webview: {
    width: '100%',
    flex: 1,
  },
});
