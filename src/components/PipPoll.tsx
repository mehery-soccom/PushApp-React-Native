import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
  PanResponder,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

interface PipPollProps {
  html: string;
  fullscreen?: boolean;
  alignment?: string; // "top-left", "center-right", etc
}

export default function PipPoll({ html, fullscreen, alignment }: PipPollProps) {
  const [maximized, setMaximized] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;

  // Convert alignment string to initial x/y
  // Convert alignment string to initial x/y
  const getInitPos = (): { x: number; y: number } => {
    const w = width / 3;
    const h = height / 3;
    let x = 10, // default left
      y = height - h - 10; // default bottom

    if (alignment) {
      const [vertical, horizontal] = alignment.split('-');

      // Vertical
      if (vertical === 'top') y = 10;
      else if (vertical === 'center') y = (height - h) / 2;
      else if (vertical === 'bottom') y = height - h - 10;

      // Horizontal
      if (horizontal === 'left') x = 10;
      else if (horizontal === 'center') x = (width - w) / 2;
      else if (horizontal === 'right') x = width - w - 10;
    }

    return { x, y };
  };

  useEffect(() => {
    pan.setValue(getInitPos());
  }, [alignment]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !maximized && !fullscreen,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
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

  if (maximized || fullscreen) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <WebView source={{ html }} style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.maxBtn}
          onPress={() => setMaximized(false)}
        >
          <Text style={styles.maxBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.pipContainer,
        { width: width / 3, height: height / 4 },
        pan.getLayout(),
      ]}
      {...panResponder.panHandlers}
    >
      <WebView source={{ html }} style={{ flex: 1 }} />
      <TouchableOpacity
        style={styles.maxBtnSmall}
        onPress={() => setMaximized(true)}
      >
        <Text style={styles.maxBtnText}>Maximize</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pipContainer: {
    position: 'absolute',
    zIndex: 400,
    elevation: 5,
    backgroundColor: '#000',
    borderRadius: 8,
    // overflow: 'hidden',
  },
  maxBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'black',
    padding: 8,
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
});
