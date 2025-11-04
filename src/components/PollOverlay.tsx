import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { triggerNextPoll } from '../events/custom/CustomEvents';

let showOverlayFn: ((element: React.ReactNode) => void) | null = null;
let hideOverlayFn: (() => void) | null = null;
let overlayQueue: React.ReactNode[] = [];

const { width, height } = Dimensions.get('window');

export const PollOverlayProvider: React.FC = () => {
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(
    null
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [isFloater, setIsFloater] = useState(false);

  const [bannerContents, setBannerContents] = useState<React.ReactNode[]>([]);
  const [pipContents, setPipContents] = useState<React.ReactNode[]>([]);
  const [bottomSheetContents, setBottomSheetContents] = useState<
    React.ReactNode[]
  >([]);

  showOverlayFn = (element: React.ReactNode) => {
    const pollType = (element as any)?.props?.pollType;
    console.log('Displaying poll type:', pollType);

    if (pollType && pollType.includes('roadblock')) {
      const cloned = React.cloneElement(element as React.ReactElement<any>, {
        onClose: hideOverlayFn,
      });

      setModalContent(cloned);
      setIsFloater(false);
      setModalVisible(true);
    } else if (pollType.includes('banner')) {
      const cloned = React.cloneElement(element as React.ReactElement<any>, {
        onClose: () => setBannerContents([]),
        key: Date.now(), // forces WebView reload
      });

      setBannerContents([cloned]);

      // Replace any existing banner
    } else if (pollType.includes('picture-in-picture')) {
      const alignment = (element as any).props?.alignment || 'center-center';
      const cloned = React.cloneElement(element as React.ReactElement<any>, {
        alignment,
        onClose: () => setPipContents([]),
      });

      setPipContents([cloned]);
    } else if (pollType.includes('floater')) {
      // ✅ Floater UI — fullscreen without cross button
      setModalContent(element);
      setIsFloater(true);
      setModalVisible(true);
    } else if (pollType.includes('bottomsheet')) {
      setBottomSheetContents([element]);
    } else {
      console.warn('Unknown poll type', pollType);
    }
  };
  hideOverlayFn = () => {
    // const wasRoadblock = (modalContent as any)?.props?.pollType === 'roadblock';

    // Step 1: Close the current modal
    setModalVisible(false);

    // Step 2: Wait for modal to finish closing animation
    setModalContent(null);
    setIsFloater(false);
    // slightly less delay, smooth transition
  };

  const handleRoadblock = () => {
    // Close current modal first
    setModalVisible(false);
    setModalContent(null);
    setIsFloater(false);

    // Slight delay to allow animation to finish
    setTimeout(() => {
      triggerNextPoll(); // now show next poll, if any
    }, 500);
  };

  useEffect(() => {
    overlayQueue.forEach((el) => showOverlayFn?.(el));
    overlayQueue = [];
  }, []);

  return (
    <>
      {/* ✅ Shared modal for roadblock and floater */}
      {modalContent && (
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalContainer}>
            {/* ❌ Only show close button if NOT floater */}
            {!isFloater && (
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleRoadblock}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            )}
            {modalContent}
          </View>
        </Modal>
      )}

      {/* Banner */}
      {bannerContents.map((content, index) => (
        <View
          key={index}
          style={[styles.bannerContainer, { zIndex: 10 + index }]}
        >
          {content}
        </View>
      ))}
      {/* PIP */}
      {pipContents.map((content, index) => {
        const isFullScreen = (content as any)?.props?.fullscreen;
        return isFullScreen ? (
          <View
            key={index}
            style={[{ zIndex: 9999 + index, width: width, height: height }]}
          >
            {content}
          </View>
        ) : (
          <React.Fragment key={index}>{content}</React.Fragment>
        );
      })}

      {/* BottomSheet */}
      {/* BottomSheet */}
      {bottomSheetContents.map((content, i) => (
        <View key={i} style={[styles.bottomSheetContainer, { zIndex: 15 + i }]}>
          {content}
        </View>
      ))}
    </>
  );
};

// External API
export const showPollOverlay = (element: React.ReactNode) => {
  if (showOverlayFn) showOverlayFn(element);
  else overlayQueue.push(element);
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    paddingVertical: 45,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    elevation: 3,
  },
  pipContainer: {
    position: 'absolute',
    width: '33%',
    height: '33%',
    bottom: 10,
    right: 10,
    elevation: 3,
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    elevation: 3,
  },
  closeBtn: {
    position: 'absolute',
    top: 80,
    right: 30,
    zIndex: 20000,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 7,
    padding: 5,
    elevation: 3,
  },
  closeText: { fontSize: 18, fontWeight: 'bold' },
});
