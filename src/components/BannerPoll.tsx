import { View, StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';

export default function BannerPoll({ html, messageId, filterId }: any) {
  const cleanHtml = html.replace(/<\/?body[^>]*>/g, '');
  console.log('📨 messageId at bann:', messageId);
  console.log('📨 filterId at bann:', filterId);
  // Send track event helper
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

  // Injected JavaScript for webview
  const injectedJS = `
  (function() {
    // Prevent zooming
    let meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    document.head.appendChild(meta);

    const style = document.createElement('style');
    style.innerHTML = \`
      html, body {
        margin: 0; padding: 0;
        overflow: hidden;
        width: 100%; height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: manipulation;
      }
      button, a { cursor: pointer; touch-action: manipulation; }
    \`;
    document.head.appendChild(style);

    // Disable double-tap zoom and pinch
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());

    document.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', function() {
        let value = this.value || this.innerText || '';
        const onclickAttr = this.getAttribute('onclick');
        if (onclickAttr) {
          const match = onclickAttr.match(/'([^']+)'\\s*\\)$/);
          if (match && match[1]) value = match[1];
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cta', value }));
      });
    });

    document.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (href) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'link', url: href }));
        }
      });
    });

    document.querySelectorAll('[data-close], .close-button, .poll-close, .close-btn')
      .forEach(el => {
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
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        scalesPageToFit={false}
        injectedJavaScript={injectedJS}
        onMessage={async (event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            console.log('📩 BannerPoll message:', msg);

            if (msg.type === 'cta') {
              sendTrackEvent('cta', msg.value);

              // ✅ Check if value is a valid URL, then open it
              const value = msg.value?.trim();
              if (value && /^(https?:\/\/|www\.)/i.test(value)) {
                const url = value.startsWith('http')
                  ? value
                  : `https://${value}`;
                console.log('🌐 Opening CTA link:', url);
                await Linking.openURL(url);
              }
            } else if (msg.type === 'link') {
              console.log('🌐 Opening link:', msg.url);
              await Linking.openURL(msg.url);
              sendTrackEvent('openUrl', msg.url);
            } else if (msg.type === 'dismissed') {
              console.log('🚪 Banner dismissed');
              sendTrackEvent('dismissed');
            } else {
              sendTrackEvent('unknown');
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
