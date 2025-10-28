import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function BannerPoll({ html, onClose }: any) {
  // Clean up HTML (remove nested <body> tags if any)
  const cleanHtml = html.replace(/<\/?body[^>]*>/g, '');

  const sendTrackEvent = async (
    eventType: 'cta' | 'dismissed',
    ctaId?: string
  ) => {
    const payload = { event: eventType, data: ctaId ? { ctaId } : {} };
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
  // Injected JS to extract CTA IDs and send them to RN
  const injectedJS = `
    (function() {
      // Basic layout fixes
      const style = document.createElement('style');
      style.innerHTML = \`
        html, body {
          margin: 0; padding: 0;
          overflow: hidden;
          width: 100%; height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .preview-wrapper, .banner-wrapper {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        button {
          cursor: pointer;
        }
      \`;
      document.head.appendChild(style);

      // Button click handler
      document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
          let value = this.value || this.innerText || '';
          const onclickAttr = this.getAttribute('onclick');

          // Try to extract the last quoted argument (e.g., 'sqoff', 'Later', etc.)
          if (onclickAttr) {
            const match = onclickAttr.match(/'([^']+)'\\s*\\)$/);
            if (match && match[1]) value = match[1];
          }

          // Send message to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cta', value }));
        });
      });

      // Close buttons
      document.querySelectorAll('[data-close], .close-button, .poll-close, .close-btn').forEach(el => {
        el.addEventListener('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismissed' }));
        });
      });
    })();
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: cleanHtml }}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        injectedJavaScript={injectedJS}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            console.log('📩 BannerPoll message:', msg);

            if (msg.type === 'cta') {
              sendTrackEvent('cta', msg.value);
              if (onClose) onClose();
            } else if (msg.type === 'dismissed') {
              console.log('🚪 Banner dismissed');
              // e.g., sendTrackEvent('dismissed');
              if (onClose) onClose();
            }
          } catch (err) {
            console.warn(
              '⚠️ Invalid message from WebView:',
              event.nativeEvent.data
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    width: '100%',
    height: 120,
    zIndex: 9999,
    backgroundColor: 'white',
  },
  webview: {
    flex: 1,
    backgroundColor: 'white',
  },
});
