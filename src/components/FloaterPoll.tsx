import { useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloaterProps {
  html: string;
  initialTop?: number;
  initialLeft?: number;
  width?: number;
  height?: number;
}

export default function Floater({
  html,
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
        // Move relative to last offset
        pan.setValue({
          x: offset.x + gestureState.dx,
          y: offset.y + gestureState.dy,
        });
      },
      onPanResponderRelease: (_, gestureState) => {
        // Save new offset
        offset.x += gestureState.dx;
        offset.y += gestureState.dy;

        // Optional: limit boundaries
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
        <WebView
          source={{ html }}
          style={styles.webview}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          pointerEvents="auto"
        />
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
    backgroundColor: 'white', // overlay background
    zIndex: 9998,
  },
  container: {
    position: 'absolute',
    backgroundColor: 'white',
    zIndex: 9999,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
    // borderRadius: 20,
  },
});
