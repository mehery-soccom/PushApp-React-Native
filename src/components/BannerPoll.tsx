import { View, StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { getApiBaseUrl } from '../helpers/getApiBaseUrl';

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
    const commonHeaders = await buildCommonHeaders();
    const baseUrl = await getApiBaseUrl();

    try {
      const res = await fetch(`${baseUrl}/v1/notification/in-app/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...commonHeaders,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log('✅ Track API response:', data);
    } catch (error) {
      console.error('❌ Track API error:', error);
    }
  };

  const normalizeUrl = (rawUrl?: string) => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const value = rawUrl.trim();
    if (!value) return '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
    if (/^https?:\/\//i.test(value)) return value;
    if (/^www\./i.test(value)) return `https://${value}`;
    return '';
  };

  // Injected JavaScript for webview
  const injectedJS = `
  (function() {
    function init() {
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

      const extractUrl = (el) => {
        const onclickAttr = el.getAttribute('onclick') || '';
        const hrefAttr = el.getAttribute('data-href') || el.getAttribute('href') || '';
        const onClickUrlMatch = onclickAttr.match(/['"]((?:https?:\\/\\/|www\\.)[^'"]+)['"]/i);
        if (onClickUrlMatch && onClickUrlMatch[1]) return onClickUrlMatch[1];
        return hrefAttr || '';
      };

      document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
          const ctaId = this.value || this.innerText || '';
          const url = extractUrl(this);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'buttonClick', ctaId, url }));
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
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
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

            if (msg.type === 'buttonClick' || msg.type === 'cta') {
              const ctaId = msg.ctaId || msg.value || '';
              const rawUrl = msg.url || msg.value || '';
              const url = normalizeUrl(rawUrl);

              await sendTrackEvent('cta', ctaId);
              if (url) {
                console.log('🌐 Opening CTA link:', url);
                await Linking.openURL(url);
                await sendTrackEvent('openUrl', url);
              }
            } else if (msg.type === 'link' || msg.type === 'openUrl') {
              const url = normalizeUrl(msg.url);
              if (url) {
                console.log('🌐 Opening link:', url);
                await Linking.openURL(url);
                await sendTrackEvent('openUrl', url);
              }
            } else if (msg.type === 'dismissed') {
              console.log('🚪 Banner dismissed');
              await sendTrackEvent('dismissed');
            } else {
              await sendTrackEvent('unknown');
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
    top: 45,
    width: '92%',
    alignSelf: 'center',
    height: 120,
    zIndex: 9999,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
