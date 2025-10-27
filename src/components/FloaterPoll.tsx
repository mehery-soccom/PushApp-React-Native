import { useRef } from 'react';
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
  initialTop?: number;
  initialLeft?: number;
  width?: number;
  height?: number;
}

export default function Floater({
  html,
  videoUrl,
  initialTop = 50,
  initialLeft = 20,
  width = screenWidth * 0.9,
  height = 200,
}: FloaterProps) {
  const pan = useRef(
    new Animated.ValueXY({ x: initialLeft, y: initialTop })
  ).current;
  const offset = useRef({ x: initialLeft, y: initialTop }).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({
          x: offset.x + gestureState.dx,
          y: offset.y + gestureState.dy,
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        offset.x += gestureState.dx;
        offset.y += gestureState.dy;

        if (offset.x < 0) offset.x = 0;
        if (offset.y < 0) offset.y = 0;
        if (offset.x + width > screenWidth) offset.x = screenWidth - width;
        if (offset.y + height > screenHeight) offset.y = screenHeight - height;

        pan.setValue({ x: offset.x, y: offset.y });
      },
    })
  ).current;

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
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
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
    // backgroundColor: 'transparent',
    backgroundColor: 'white',
  },
  container: {
    position: 'absolute',
    // backgroundColor: 'white',
    // borderRadius: 8,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
