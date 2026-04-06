import { WebView } from 'react-native-webview';
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import { sendCustomEvent } from '../events/custom/CustomEvents';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { getApiBaseUrl } from '../helpers/tenantContext';

const inlinePollRegistry: Record<
  string,
  {
    htmlContent: string;
    style?: any;
    updatedAt: number;
    messageId?: string;
    filterId?: string;
  }
> = {};

export async function renderInlinePoll(
  placeholderId: string,
  htmlContent: string | null,
  style?: any,
  { messageId, filterId }: { messageId?: string; filterId?: string } = {}
) {
  // 🧹 Clear if null
  if (!htmlContent) {
    delete inlinePollRegistry[placeholderId];
    console.log(`🧹 Cleared inline poll for ${placeholderId}`);
    return;
  }

  const pollData = {
    htmlContent,
    style,
    messageId, // ✅ store messageId
    filterId, // ✅ store filterId
    updatedAt: Date.now(),
  };

  // 🧠 Save in memory only
  inlinePollRegistry[placeholderId] = pollData;
  console.log(
    `💾 Saved inline poll in memory for ${placeholderId} @ ${pollData.updatedAt}`
  );
}

const MIN_HEIGHT = 1;
const FALLBACK_HEIGHT = 180;
const HEIGHT_BUFFER = 8;

export function InlinePollContainer({
  placeholderId,
}: {
  placeholderId: string;
}) {
  const [poll, setPoll] = useState<any>(
    inlinePollRegistry[placeholderId] || null
  );
  const [contentHeight, setContentHeight] = useState<number>(FALLBACK_HEIGHT);
  const pollRef = useRef(poll);
  const lastHeightRef = useRef(0);
  pollRef.current = poll;

  // 🔄 Load poll data (memory only)
  useEffect(() => {
    const memPoll = inlinePollRegistry[placeholderId];
    setPoll(memPoll?.htmlContent ? memPoll : null);
  }, [placeholderId]);

  // 🔁 Watch for in-memory updates every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      const memPoll = inlinePollRegistry[placeholderId];
      const currentPoll = pollRef.current;
      if (!memPoll && currentPoll) {
        setPoll(null);
        return;
      }
      if (
        memPoll &&
        JSON.stringify(memPoll.htmlContent) !==
          JSON.stringify(currentPoll?.htmlContent)
      ) {
        console.log(`🔄 Poll updated to latest for ${placeholderId}`);
        setPoll(memPoll);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [placeholderId]);

  // 🛰 Track CTA and open events
  const sendTrackEvent = async (
    eventType: 'cta' | 'dismissed' | 'longPress' | 'openUrl' | 'unknown',
    ctaId?: string
  ) => {
    if (!poll) return;

    const payload = {
      messageId: poll.messageId, // ✅ fixed
      filterId: poll.filterId, // ✅ fixed
      event: eventType,
      data: ctaId ? { ctaId } : {},
    };

    console.log('📤 Sending track event:', payload);
    const commonHeaders = await buildCommonHeaders();
    const apiBaseUrl = await getApiBaseUrl();

    try {
      const res = await fetch(`${apiBaseUrl}/v1/notification/in-app/track`, {
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

  // Reset height when poll content changes
  useEffect(() => {
    if (poll?.htmlContent) setContentHeight(FALLBACK_HEIGHT);
  }, [poll?.htmlContent, poll?.updatedAt]);

  // 🧩 Handle messages from WebView
  const onMessage = (event: any) => {
    const raw = event.nativeEvent.data;
    try {
      const message = JSON.parse(raw);

      if (
        message.type === 'contentHeight' &&
        typeof message.height === 'number'
      ) {
        const newHeight = Math.max(MIN_HEIGHT, message.height + HEIGHT_BUFFER);
        if (Math.abs(newHeight - lastHeightRef.current) > 2) {
          lastHeightRef.current = newHeight;
          setContentHeight(newHeight);
        }
        return;
      }
      console.log('📩 InlinePoll message:', message);

      switch (message.type) {
        case 'buttonClick':
        case 'cta': {
          const ctaId = message.ctaId || message.value || '';
          const url = normalizeUrl(message.url || message.value || '');
          // console.log('🟢 Sending CTA button click:', ctaId, url ? `→ ${url}` : '');
          sendTrackEvent('cta', ctaId);
          sendCustomEvent('sendcta', {
            ctaId,
            url: url || undefined,
            compare: placeholderId,
            messageId: poll?.messageId,
            filterId: poll?.filterId,
          });
          if (url) {
            Linking.openURL(url).catch((err) =>
              console.error('❌ Failed to open URL:', err)
            );
          }
          break;
        }

        case 'closePoll':
          sendTrackEvent('dismissed');
          break;

        case 'longPress':
          sendTrackEvent('longPress', message.value);
          break;

        case 'openUrl':
        case 'link': {
          const url = normalizeUrl(message.url);
          sendTrackEvent('openUrl', url);
          if (url) {
            Linking.openURL(url).catch((err) =>
              console.error('❌ Failed to open URL:', err)
            );
          }
          break;
        }

        default:
          console.warn('⚠️ Unknown message type:', message);
          sendTrackEvent('unknown', JSON.stringify(message));
      }
    } catch (err) {
      console.warn('⚠️ Invalid message from WebView:', raw);
      sendTrackEvent('unknown', JSON.stringify(raw));
    }
  };

  useEffect(() => {
    if (poll?.htmlContent) {
      console.log('🧩 Inline poll rendered:', placeholderId);
      sendCustomEvent('widget_open', {
        compare: placeholderId,
        messageId: poll?.messageId,
        filterId: poll?.filterId,
      });
    }
  }, [placeholderId, poll]);

  if (!poll?.htmlContent) return null;

  const injectedJS = `
    (function() {
      const send = (data) => window.ReactNativeWebView.postMessage(JSON.stringify(data));
function measureAndSend() {
  const wrapper = document.querySelector('.preview-wrapper');

  const height = wrapper
    ? wrapper.getBoundingClientRect().height
    : document.documentElement.scrollHeight;

  send({ type: 'contentHeight', height: Math.ceil(height) });
}
      if (document.readyState === 'complete') {
        measureAndSend();
        setTimeout(measureAndSend, 400);
      } else {
        window.addEventListener('load', function() {
          measureAndSend();
        });
      }
      document.querySelectorAll('img').forEach(function(img) {
        img.onload = measureAndSend;
        if (img.complete) measureAndSend();
      });
      
      function initListeners() {
        const attachClickListener = function(element) {
          element.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            var value = this.value || this.innerText || '';
            var url = '';
            var onclick = (this.getAttribute('onclick') || '');
            var href = (this.getAttribute('data-href') || this.getAttribute('href') || '');
            
            var match = onclick.match(/handleClick\\s*\\([^,]*,[^,]*,\\s*['"]([^'"]+)['"]\\)/) || onclick.match(/['"]((?:https?:\\/\\/|www\\.)[^'"]+)['"]/);
            if (match) {
              url = match[1] || '';
            } else if (href) {
              url = href;
            }
            send({ type: 'buttonClick', ctaId: value, url: url });
          }, true);
        };

        document.querySelectorAll('button').forEach(attachClickListener);
        document.querySelectorAll('a').forEach(attachClickListener);

        document.querySelectorAll('[data-close], .close-button, .poll-close, .close-btn').forEach(el => {
          el.addEventListener('click', () => send({ type: 'closePoll' }));
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initListeners);
      } else {
        initListeners();
      }
    })();
    true;
  `;

  const layoutFixStyles = `
<style id="inline-poll-layout-fix">
  html, body { margin: 0; padding: 0; width: 100%; height: auto !important; min-height: auto !important; overflow: visible !important; }
  .preview-wrapper, .preview-wrapper.pop-up-dimensions, .pop-up-dimensions {
    position: relative !important;
    top: auto !important; left: auto !important; right: auto !important; bottom: auto !important;
    transform: none !important;
    width: 92% !important;
    max-width: 420px !important;
    margin: 0 auto;
  }
  .banner-wrapper { height: auto !important; min-height: 100px !important; width: 100% !important; }
</style>`;

  const injectedHTML =
    poll.htmlContent.indexOf('</body>') !== -1
      ? poll.htmlContent.replace(/<\/body\s*>/i, layoutFixStyles + '$&')
      : poll.htmlContent + layoutFixStyles;
  const containerHeight = Math.max(FALLBACK_HEIGHT, contentHeight);

  return (
    <View
      style={[styles.container, { height: containerHeight }]}
      key={poll?.updatedAt}
    >
      <WebView
        originWhitelist={['*']}
        source={{ html: injectedHTML }}
        injectedJavaScript={injectedJS}
        onMessage={onMessage}
        style={[styles.webview, { height: containerHeight }]}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  webview: {},
});
