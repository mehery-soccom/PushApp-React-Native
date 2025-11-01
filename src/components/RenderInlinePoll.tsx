import { WebView } from 'react-native-webview';
import { useEffect, useState } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendCustomEvent } from '../events/custom/CustomEvents';

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

export function InlinePollContainer({
  placeholderId,
}: {
  placeholderId: string;
}) {
  const [poll, setPoll] = useState<any>(
    inlinePollRegistry[placeholderId] || null
  );

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

  // 🔁 Watch for updates every 300ms
  useEffect(() => {
    const interval = setInterval(async () => {
      const memPoll = inlinePollRegistry[placeholderId];
      if (!memPoll && poll) {
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
            JSON.stringify(poll?.htmlContent)
        ) {
          console.log(`🔄 Poll updated to latest for ${placeholderId}`);
          setPoll(chosenPoll);
        }
      } catch (err) {
        console.warn('Failed to check latest inline poll', err);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [placeholderId, poll]);

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

  // 🧩 Handle messages from WebView
  const onMessage = (event: any) => {
    const raw = event.nativeEvent.data;
    try {
      const message = JSON.parse(raw);
      console.log('📩 InlinePoll message:', message);

      switch (message.type) {
        case 'buttonClick':
          console.log('🟢 Sending CTA button click:', message.value);
          sendTrackEvent('cta', message.value);
          sendCustomEvent('sendcta', {
            ctaId: message.value,
            compare: placeholderId,
            messageId: poll?.messageId,
            filterId: poll?.filterId,
          });
          break;

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
      document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const value = btn.value || btn.innerText || '';
          send({ type: 'buttonClick', value });
        });
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

  const injectedHTML = `
    <style>
      ::-webkit-scrollbar { display: none; }
      body { overflow: hidden; margin: 0; padding: 0; }
    </style>
    ${poll.htmlContent}
  `;

  return (
    <View style={styles.container} key={poll?.updatedAt}>
      <WebView
        originWhitelist={['*']}
        source={{ html: injectedHTML }}
        injectedJavaScript={injectedJS}
        onMessage={onMessage}
        style={styles.webview}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
  },
  webview: {
    flex: 1,
  },
});
