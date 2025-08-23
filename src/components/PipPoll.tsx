import { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Dimensions,
  StyleSheet,
} from 'react-native';
import type { ViewStyle } from 'react-native';

import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

export default function PipPoll({ html, alignment }: any) {
  const [maximized, setMaximized] = useState(false);

  if (maximized) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <WebView source={{ html }} style={{ flex: 1 }} />
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            backgroundColor: 'black',
            padding: 8,
          }}
          onPress={() => setMaximized(false)}
        >
          <Text style={{ color: 'white' }}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pipStyle: ViewStyle = {
    position: 'absolute',
    width: width / 3,
    height: height / 3,
  };

  // Parse alignment string e.g. "bottom-right"
  const [vertical, horizontal] = alignment.split('-');

  if (vertical === 'top') pipStyle.top = 0;
  if (vertical === 'center') pipStyle.top = height / 3;
  if (vertical === 'bottom') pipStyle.bottom = 0;

  if (horizontal === 'left') pipStyle.left = 0;
  if (horizontal === 'center') pipStyle.left = width / 3;
  if (horizontal === 'right') pipStyle.right = 0;

  return (
    <View style={pipStyle}>
      <WebView source={{ html }} style={{ flex: 1 }} />
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 5,
          right: 5,
          backgroundColor: 'black',
          padding: 6,
        }}
        onPress={() => setMaximized(true)}
      >
        <Text style={{ color: 'white' }}>Maximize</Text>
      </TouchableOpacity>
    </View>
  );
}
