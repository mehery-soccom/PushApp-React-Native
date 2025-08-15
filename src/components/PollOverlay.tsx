// SDK/components/PollOverlay.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// Functions that will be set when provider mounts
let showOverlayFn: ((html: string) => void) | null = null;
let hideOverlayFn: (() => void) | null = null;

// Queue HTML if overlay is called before mount
let overlayQueue: string[] = [];

export const PollOverlayProvider: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [html, setHtml] = useState('');

  // Function to show overlay
  showOverlayFn = (htmlContent: string) => {
    console.log('📣 PollOverlay triggered with HTML:', htmlContent);
    setHtml(htmlContent);
    setVisible(true);
  };

  // Function to hide overlay
  hideOverlayFn = () => {
    console.log('❌ PollOverlay hidden');
    setVisible(false);
  };

  // Flush any queued HTML after mounting
  useEffect(() => {
    overlayQueue.forEach((h) => showOverlayFn?.(h));
    overlayQueue = [];
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={hideOverlayFn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <WebView source={{ html }} style={styles.webview} />
      </View>
    </Modal>
  );
};

// Public function to show overlay
export const showPollOverlay = (html: string) => {
  if (showOverlayFn) {
    showOverlayFn(html);
  } else {
    console.warn('⚠ PollOverlayProvider not mounted yet, queuing HTML');
    overlayQueue.push(html);
  }
};

// Public function to hide overlay
export const hidePollOverlay = () => {
  if (hideOverlayFn) hideOverlayFn();
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000aa' },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    elevation: 3,
  },
  closeText: { fontSize: 18, fontWeight: 'bold' },
  webview: { flex: 1, marginTop: 80 },
});
