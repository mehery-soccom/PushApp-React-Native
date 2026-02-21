import { WebView } from 'react-native-webview';
import { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendCustomEvent } from '../events/custom/CustomEvents';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';

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
    try {
      await AsyncStorage.removeItem(`inline_poll_${placeholderId}`);
      console.log(`🧹 Cleared inline poll for ${placeholderId}`);
    } catch (err) {
      console.warn('[SDK] Failed to clear inline poll', err);
    }
    return;
  }

  const pollData = {
    htmlContent,
    style,
    messageId, // ✅ store messageId
    filterId, // ✅ store filterId
    updatedAt: Date.now(),
  };

  // 🧠 Save in memory and disk
  inlinePollRegistry[placeholderId] = pollData;
  try {
    await AsyncStorage.setItem(
      `inline_poll_${placeholderId}`,
      JSON.stringify(pollData)
    );
    console.log(
      `💾 Saved inline poll for ${placeholderId} @ ${pollData.updatedAt}`
    );
  } catch (err) {
    console.warn('[SDK] Failed to save inline poll locally', err);
  }
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

  // 🔄 Load poll data (memory + disk)
  useEffect(() => {
    const loadPoll = async () => {
      const memPoll = inlinePollRegistry[placeholderId];
      try {
        const backupStr = await AsyncStorage.getItem(
          `inline_poll_${placeholderId}`
        );
        const backup = backupStr ? JSON.parse(backupStr) : null;

        const chosenPoll =
          !memPoll && backup
            ? backup
            : !backup && memPoll
              ? memPoll
              : memPoll && backup
                ? memPoll.updatedAt >= backup.updatedAt
                  ? memPoll
                  : backup
                : null;

        if (chosenPoll?.htmlContent) {
          setPoll(chosenPoll);
        } else {
          await AsyncStorage.removeItem(`inline_poll_${placeholderId}`);
          setPoll(null);
        }
      } catch (err) {
        console.warn('[SDK] Failed to load inline poll backup', err);
        setPoll(null);
      }
    };

    loadPoll();
  }, [placeholderId]);

  // 🔁 Watch for updates every 3s (was 300ms – caused excessive re-renders)
  useEffect(() => {
    const interval = setInterval(async () => {
      const memPoll = inlinePollRegistry[placeholderId];
      const currentPoll = pollRef.current;
      if (!memPoll && currentPoll) {
        setPoll(null);
        return;
      }

      try {
        const backupStr = await AsyncStorage.getItem(
          `inline_poll_${placeholderId}`
        );
        const backup = backupStr ? JSON.parse(backupStr) : null;
        const chosenPoll =
          !memPoll && backup
            ? backup
            : !backup && memPoll
              ? memPoll
              : memPoll && backup
                ? memPoll.updatedAt >= backup.updatedAt
                  ? memPoll
                  : backup
                : null;

        if (
          chosenPoll &&
          JSON.stringify(chosenPoll.htmlContent) !==
            JSON.stringify(currentPoll?.htmlContent)
        ) {
          console.log(`🔄 Poll updated to latest for ${placeholderId}`);
          setPoll(chosenPoll);
        }
      } catch (err) {
        console.warn('Failed to check latest inline poll', err);
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

    try {
      const res = await fetch(
        'https://demo.pushapp.co.in/pushapp/api/v1/notification/in-app/track',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...commonHeaders,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      console.log('✅ Track API response:', data);
    } catch (error) {
      console.error('❌ Track API error:', error);
    }
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
        case 'buttonClick': {
          const ctaId = message.value || message.ctaId || '';
          const url = message.url || '';
          // console.log('🟢 Sending CTA button click:', ctaId, url ? `→ ${url}` : '');
          sendTrackEvent('cta', ctaId);
          sendCustomEvent('sendcta', {
            ctaId,
            url: url || undefined,
            compare: placeholderId,
            messageId: poll?.messageId,
            filterId: poll?.filterId,
          });
          if (
            url &&
            (url.startsWith('http://') || url.startsWith('https://'))
          ) {
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
          sendTrackEvent('openUrl', message.url);
          if (message.url) {
            Linking.openURL(message.url).catch((err) =>
              console.error('❌ Failed to open URL:', err)
            );
          }
          break;

        default:
          console.warn('⚠️ Unknown message type:', message);
          sendTrackEvent('unknown', message);
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
    } else {
      AsyncStorage.removeItem(`inline_poll_${placeholderId}`).catch(() => {});
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
      document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopImmediatePropagation();
          var value = btn.value || btn.innerText || '';
          var url = '';
          var onclick = (btn.getAttribute('onclick') || '');
          var match = onclick.match(/handleClick\\s*\\([^,]*,[^,]*,\\s*['"]([^'"]+)['"]\\)/) || onclick.match(/['"](https?:\\/\\/[^'"]+)['"]/);
          if (match) url = match[1] || '';
          send({ type: 'buttonClick', value: value, url: url });
        }, true);
      });
      document.querySelectorAll('[data-close], .close-button').forEach(el => {
        el.addEventListener('click', () => send({ type: 'closePoll' }));
      });
      document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', e => {
          e.preventDefault();
          send({ type: 'openUrl', url: link.href });
        });
      });
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
