import { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  PanResponder,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';

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

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 15,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100) handleClose();
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
      const send = (data) => window.ReactNativeWebView.postMessage(JSON.stringify(data));

      document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          let url = btn.getAttribute('data-href') || btn.getAttribute('href') || '';
          send({ type: 'buttonClick', value: btn.innerText || btn.value || '', url });
        });
      });

      document.querySelectorAll('[data-close], .poll-close').forEach(el =>
        el.addEventListener('click', () => send({ type: 'closePoll' }))
      );
    })();
  `;

  const onMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'buttonClick':
          await sendTrackEvent('cta', msg.value);
          if (msg.url) {
            try {
              await sendTrackEvent('openUrl', msg.url);
              await Linking.openURL(msg.url);
            } catch (err) {
              console.error('❌ Failed to open URL:', err);
            }
          }
          handleClose();
          break;

        case 'closePoll':
          await sendTrackEvent('dismissed');
          handleClose();
          break;

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
  webview: { flex: 1, backgroundColor: 'transparent' },
});
