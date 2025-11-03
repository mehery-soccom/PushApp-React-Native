// import { useRef, useEffect, useState } from 'react';
// import {
//   View,
//   PanResponder,
//   Animated,
//   Dimensions,
//   StyleSheet,
//   Linking,
// } from 'react-native';
// import { WebView } from 'react-native-webview';

// const { height } = Dimensions.get('window');

// interface BottomSheetPollProps {
//   html: string;
//   visible?: boolean;
//   pollType?: string;
//   style?: any;
//   onClose?: () => void;
//   messageId?: string;
//   filterId?: string;
// }

// export default function BottomSheetPoll({
//   html,
//   visible,
//   onClose,
//   messageId,
//   filterId,
// }: BottomSheetPollProps) {
//   const translateY = useRef(new Animated.Value(height)).current;
//   const [overlayVisible, setOverlayVisible] = useState(false);
//   const [overlayText, setOverlayText] = useState('');

//   useEffect(() => {
//     Animated.timing(translateY, {
//       toValue: visible ? 0 : height,
//       duration: 300,
//       useNativeDriver: true,
//     }).start();
//   }, [visible, translateY]);

//   const showOverlay = (text: string) => {
//     setOverlayText(text);
//     setOverlayVisible(true);
//     setTimeout(() => setOverlayVisible(false), 1200);
//   };

//   const panResponder = useRef(
//     PanResponder.create({
//       onMoveShouldSetPanResponder: (_, gesture) => {
//         // Only start pan if vertical swipe is large and starts near top
//         return Math.abs(gesture.dy) > 15 && gesture.dy > 0;
//       },
//       onStartShouldSetPanResponderCapture: () => false, // allow WebView touches
//       onMoveShouldSetPanResponderCapture: (_, gesture) => gesture.dy > 15,
//       onPanResponderMove: (_, gesture) => {
//         if (gesture.dy > 0) translateY.setValue(gesture.dy);
//       },
//       onPanResponderRelease: (_, gesture) => {
//         if (gesture.dy > 100) {
//           Animated.timing(translateY, {
//             toValue: height,
//             duration: 200,
//             useNativeDriver: true,
//           }).start(() => {
//             sendTrackEvent('dismissed');
//             onClose?.();
//           });
//         } else {
//           Animated.spring(translateY, {
//             toValue: 0,
//             useNativeDriver: true,
//           }).start();
//         }
//       },
//     })
//   ).current;

//   // 🔹 Send tracking event to backend
//   const sendTrackEvent = async (
//     eventType: 'cta' | 'dismissed' | 'longPress' | 'openUrl' | 'unknown',
//     ctaId?: string
//   ) => {
//     const payload = {
//       messageId,
//       filterId,
//       event: eventType,
//       data: ctaId ? { ctaId } : {},
//     };

//     console.log('📤 Sending track event:', payload);

//     try {
//       const res = await fetch(
//         'https://demo.pushapp.co.in/pushapp/api/v1/notification/in-app/track',
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(payload),
//         }
//       );
//       const data = await res.json();
//       console.log('✅ Track API response:', data);
//     } catch (error) {
//       console.error('❌ Track API error:', error);
//     }
//   };
//   console.log('html at bs:', html);

//   // 🔹 Inject JS (borrowed from working RoadblockPoll)
//   const injectedJS = `
//     (function() {
//       document.body.style.touchAction = 'manipulation';
//       document.body.style.userSelect = 'none';
//       document.body.style.webkitUserSelect = 'none';
//       document.body.style.webkitTouchCallout = 'none';

//       const send = (data) => {
//         window.ReactNativeWebView.postMessage(JSON.stringify(data));
//       };

//       document.querySelectorAll('button').forEach(btn => {
//         let pressTimer;

//         btn.addEventListener('click', function(e) {
//           e.preventDefault();
//           e.stopPropagation();
//           let value = this.value || this.innerText || '';
//           let targetUrl = '';

//           const onclickAttr = this.getAttribute('onclick');
//           const hrefAttr = this.getAttribute('data-href') || this.getAttribute('href');

//           if (onclickAttr) {
//             const urlMatch = onclickAttr.match(/'(https?:[^']+)'/);
//             if (urlMatch) targetUrl = urlMatch[1];
//           } else if (hrefAttr) {
//             targetUrl = hrefAttr;
//           }

//           send({ type: 'buttonClick', value });
//           if (targetUrl) send({ type: 'openUrl', url: targetUrl });
//         });

//         btn.addEventListener('touchstart', function() {
//           let value = this.innerText || this.value || 'Button';
//           pressTimer = setTimeout(() => send({ type: 'longPress', value }), 600);
//         });

//         ['touchend', 'touchmove', 'touchcancel'].forEach(ev =>
//           btn.addEventListener(ev, () => clearTimeout(pressTimer))
//         );
//       });

//       document.querySelectorAll('[data-close], .close-button, .poll-close, .close-btn')
//         .forEach(el =>
//           el.addEventListener('click', () => send({ type: 'closePoll' }))
//         );
//     })();
//   `;

//   // 🔹 Final HTML wrapper
//   const injectedHtml = `
//     <!DOCTYPE html>
//     <html lang="en">
//       <head>
//         <meta charset="UTF-8" />
//         <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no" />
//         <style>
//           html, body {
//             margin: 0; padding: 0; width: 100%; height: 100%;
//             overflow: hidden; background-color: transparent;
//           }
//           #media-container {
//             width: 100%; height: 100%;
//             display: flex; flex-direction: column;
//             justify-content: center; align-items: center;
//             background-color: #fff;
//           }

//         </style>
//       </head>
//       <body>
//         <div id="media-container">${html}</div>
//       </body>
//     </html>
//   `;

//   return (
//     <View style={styles.container}>
//       <Animated.View
//         style={[styles.bottomSheet, { transform: [{ translateY }] }]}
//         // {...panResponder.panHandlers}
//       >
//         <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
//           <View style={styles.dragHandle} />
//         </View>
//         <WebView
//           originWhitelist={['*']}
//           source={{ html: html }}
//           style={styles.webview}
//           onMessage={async (event) => {
//             try {
//               const message = JSON.parse(event.nativeEvent.data);
//               console.log('📩 WebView message:', message);

//               switch (message.type) {
//                 case 'buttonClick':
//                   sendTrackEvent('cta', message.value);
//                   onClose?.();
//                   break;

//                 case 'openUrl':
//                   sendTrackEvent('openUrl', message.url);
//                   if (message.url) await Linking.openURL(message.url);
//                   break;

//                 case 'closePoll':
//                   sendTrackEvent('dismissed');
//                   onClose?.();
//                   break;

//                 case 'longPress':
//                   sendTrackEvent('longPress', message.value);
//                   showOverlay(message.value);
//                   break;

//                 default:
//                   sendTrackEvent('unknown', JSON.stringify(message));
//               }
//             } catch (err) {
//               console.warn(
//                 '⚠️ Invalid WebView message:',
//                 event.nativeEvent.data
//               );
//               sendTrackEvent('unknown', 'invalid_json');
//             }
//           }}
//           injectedJavaScript={injectedJS}
//           javaScriptEnabled
//           domStorageEnabled
//           allowFileAccess
//           allowsInlineMediaPlayback
//           allowsFullscreenVideo
//           mediaPlaybackRequiresUserAction={false}
//           mixedContentMode="always"
//           userAgent="Mozilla/5.0 (ReactNativeWebView)"
//         />
//       </Animated.View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     ...StyleSheet.absoluteFillObject,
//     justifyContent: 'flex-end',
//     zIndex: 1040,
//   },
//   bottomSheet: {
//     height: height * 0.5,
//     width: '100%',
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     overflow: 'hidden',
//     elevation: 10, // ✅ ensures touch works above other views
//   },
//   webview: {
//     width: '100%',
//     flex: 1,
//     backgroundColor: 'transparent',
//   },
// });

import { useRef, useEffect, useState } from 'react';
import {
  View,
  PanResponder,
  Animated,
  Dimensions,
  StyleSheet,
  Linking,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { height } = Dimensions.get('window');

interface BottomSheetPollProps {
  html: string;
  visible?: boolean;
  onClose?: () => void;
  messageId?: string;
  filterId?: string;
}

export default function BottomSheetPoll({
  html,
  visible = false,
  onClose,
  messageId,
  filterId,
}: BottomSheetPollProps) {
  const translateY = useRef(new Animated.Value(height)).current;
  const [showModal, setShowModal] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setShowModal(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // sendTrackEvent('dismissed');
      setShowModal(false);
      onClose?.();
    });
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

  // 🔹 Send tracking event to backend
  const sendTrackEvent = async (
    eventType: 'cta' | 'dismissed' | 'longPress' | 'openUrl' | 'unknown',
    ctaId?: string
  ) => {
    const payload = {
      messageId,
      filterId,
      event: eventType,
      data: ctaId ? { ctaId } : {},
    };

    console.log('📤 Sending track event:', payload);

    try {
      const res = await fetch(
        'https://demo.pushapp.co.in/pushapp/api/v1/notification/in-app/track',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      console.log('✅ Track API response:', data);
    } catch (error) {
      console.error('❌ Track API error:', error);
    }
  };

  // console.log('html at bs:', html);

  // 🔹 Injected JavaScript (event hooks for WebView)
  const injectedJS = `
    (function() {
      document.body.style.touchAction = 'manipulation';
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.webkitTouchCallout = 'none';

      const send = (data) => {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      };

      document.querySelectorAll('button').forEach(btn => {
        let pressTimer;

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          const value = this.value || this.innerText || '';
          let targetUrl = '';

          const onclickAttr = this.getAttribute('onclick');
          const hrefAttr = this.getAttribute('data-href') || this.getAttribute('href');

          if (onclickAttr) {
            const urlMatch = onclickAttr.match(/'(https?:[^']+)'/);
            if (urlMatch) targetUrl = urlMatch[1];
          } else if (hrefAttr) {
            targetUrl = hrefAttr;
          }

          send({ type: 'buttonClick', value });
          if (targetUrl) send({ type: 'openUrl', url: targetUrl });
        });

        btn.addEventListener('touchstart', function() {
          const value = this.innerText || this.value || 'Button';
          pressTimer = setTimeout(() => send({ type: 'longPress', value }), 600);
        });

        ['touchend', 'touchmove', 'touchcancel'].forEach(ev =>
          btn.addEventListener(ev, () => clearTimeout(pressTimer))
        );
      });

      document.querySelectorAll('[data-close], .close-button, .poll-close, .close-btn')
        .forEach(el =>
          el.addEventListener('click', () => send({ type: 'closePoll' }))
        );
    })();
  `;

  const onMessage = async (event: any) => {
    const raw = event.nativeEvent.data;

    try {
      const message = JSON.parse(raw);
      console.log('📩 WebView message:', message);

      switch (message.type) {
        case 'buttonClick':
          // ✅ Only send CTA event
          sendTrackEvent('cta', message.value);

          // If the message also has a URL, open it — but don’t send openUrl track
          if (message.url) {
            try {
              await Linking.openURL(message.url);
            } catch (err) {
              console.error('❌ Failed to open URL:', err);
            }
          }

          // Close after click
          handleClose?.();
          break;

        case 'openUrl':
          // ✅ Only send openUrl if it's NOT triggered by a button click
          // if (!message.value) {
          //   sendTrackEvent('openUrl', message.url);
          // }

          if (message.url) {
            try {
              await Linking.openURL(message.url);
            } catch (err) {
              console.error('❌ Failed to open URL:', err);
            }
          }
          break;

        case 'closePoll':
          sendTrackEvent('dismissed');
          handleClose?.();
          break;

        default:
          sendTrackEvent('unknown', JSON.stringify(message));
      }
    } catch (err) {
      console.warn('⚠️ Invalid WebView message:', raw);
      sendTrackEvent('unknown', 'invalid_json');
    }
  };

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* <View style={styles.dragHandleArea}>
          <View style={styles.dragHandle} />
        </View> */}

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
          androidLayerType="hardware"
          nestedScrollEnabled
          userAgent="Mozilla/5.0 (ReactNativeWebView)"
          onMessage={onMessage}
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: height * 0.5,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  dragHandle: {
    width: 60,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#ccc',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
