import React, { useRef, useEffect } from 'react';
import {
  View,
  PanResponder,
  Animated,
  Dimensions,
  StyleSheet,
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
}: BottomSheetPollProps) {
  const translateY = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : height,
      duration: 300,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Only allow vertical gestures
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
          }).start(() => onClose());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  if (!visible) return null;

  // Inject fixes to ensure image/video fills correctly on first render
  const injectedHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="initial-scale=1.0" />
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        -webkit-text-size-adjust: 100%;
      }

      /* Fix for iOS auto-zoom and layout scaling */
      img, video {
        width: 100% !important;
        height: auto !important;
        display: block;
        object-fit: cover;
      }

      .media-preview {
        width: 100% !important;
        height: 100% !important;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
    <script>
      // Ensure image expands immediately on load
      window.addEventListener('load', () => {
        const img = document.querySelector('.media-preview img');
        if (img) {
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.objectFit = 'cover';
        }
      });
    </script>
  </head>
  <body>
    ${html}
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
          onMessage={(event) => {
            const label = event.nativeEvent.data;
            console.log('Button clicked:', label);
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
