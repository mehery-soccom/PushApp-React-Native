import { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Video from 'react-native-video';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloaterProps {
  html?: string;
  videoUrl?: string;
  position?: 'top' | 'center' | 'bottom';
  width?: number;
  height?: number;
}

export default function Floater({
  html,
  videoUrl,
  position = 'bottom',
  width = 130,
  height = 130,
}: FloaterProps) {
  // ✅ Compute initial position based on alignment
  const initialTop =
    position === 'top'
      ? 50
      : position === 'center'
        ? (screenHeight - height) / 2
        : screenHeight - height - 80;

  const initialLeft = (screenWidth - width) / 2;

  const pan = useRef(
    new Animated.ValueXY({ x: initialLeft, y: initialTop })
  ).current;
  const positionRef = useRef({ x: initialLeft, y: initialTop }); // ✅ persistent tracker

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
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

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.container,
          {
            width,
            height,
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
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
          />
        )}
      </Animated.View>
    </View>
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
