import React, { useRef, useEffect } from 'react';
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

  const sendTrackEvent = async (eventType: string, data?: any) => {
    console.log('📤 Tracking:', { messageId, filterId, eventType, data });
    try {
      await fetch(
        'https://demo.pushapp.co.in/pushapp/api/v1/notification/in-app/track',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, filterId, event: eventType, data }),
        }
      );
    } catch (err) {
      console.error('❌ Track error', err);
    }
  };

  const injectedJS = `
  (function() {
    const send = (data) => window.ReactNativeWebView.postMessage(JSON.stringify(data));

    document.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();

        let url = btn.getAttribute('data-href') || btn.getAttribute('href') || '';
        send({ type:'buttonClick', value: btn.innerText||btn.value||'', url });
      });
    });

    document.querySelectorAll('[data-close], .poll-close').forEach(el => 
      el.addEventListener('click', ()=>send({ type:'closePoll' }))
    );
  })();
`;
  const onMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case 'buttonClick':
          sendTrackEvent('cta', msg.value);

          if (msg.url) {
            try {
              await Linking.openURL(msg.url);
            } catch (err) {
              console.error('❌ Failed to open URL:', err);
            }
          }

          handleClose();
          break;

        case 'closePoll':
          sendTrackEvent('dismissed');
          handleClose();
          break;

        default:
          sendTrackEvent('unknown', msg);
          break;
      }
    } catch {
      sendTrackEvent('unknown', 'invalid_json');
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
