// PollOverlay.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet } from 'react-native';

let showOverlayFn: ((element: React.ReactNode) => void) | null = null;
let hideOverlayFn: (() => void) | null = null;
let overlayQueue: React.ReactNode[] = [];

export const PollOverlayProvider: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [content, setContent] = useState<React.ReactNode | null>(null);

  showOverlayFn = (element: React.ReactNode) => {
    setContent(element);
    setVisible(true);
  };

  hideOverlayFn = () => setVisible(false);

  useEffect(() => {
    overlayQueue.forEach((el) => showOverlayFn?.(el));
    overlayQueue = [];
  }, []);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={hideOverlayFn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        {content}
      </View>
    </Modal>
  );
};

export const showPollOverlay = (element: React.ReactNode) => {
  if (showOverlayFn) {
    showOverlayFn(element);
  } else {
    console.warn('⚠ PollOverlayProvider not mounted yet, queuing element');
    overlayQueue.push(element);
  }
};

export const hidePollOverlay = () => {
  if (hideOverlayFn) hideOverlayFn();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
  },
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
});
