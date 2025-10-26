import { WebView } from 'react-native-webview';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendCustomEvent } from '../events/custom/CustomEvents';

const inlinePollRegistry: Record<
  string,
  { htmlContent: string; style?: any; updatedAt: number }
> = {};

export async function renderInlinePoll(
  placeholderId: string,
  htmlContent: string | null,
  style?: any
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
    updatedAt: Date.now(), // ⏱ mark as latest
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

  useEffect(() => {
    const loadPoll = async () => {
      const memPoll = inlinePollRegistry[placeholderId];
      try {
        const backupStr = await AsyncStorage.getItem(
          `inline_poll_${placeholderId}`
        );
        const backup = backupStr ? JSON.parse(backupStr) : null;

        // 🧩 Compare timestamps and pick the newest
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

  // 🔁 Watch memory updates every 300ms and take the most recent
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

  useEffect(() => {
    if (poll?.htmlContent) {
      console.log('inline poll rendered:', placeholderId);
      sendCustomEvent('widget_open', { compare: placeholderId });
    } else {
      AsyncStorage.removeItem(`inline_poll_${placeholderId}`).catch(() => {});
    }
  }, [placeholderId, poll]);

  if (!poll?.htmlContent) return null;

  const injectedJS = `
    (function() {
      document.addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (target) {
          const ctaId = target.id || target.getAttribute('data-cta-id') || 'unknown';
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'sendcta', ctaId }));
        }
      });
    })();
    true;
  `;

  const injectedHTML = `
    <style>
      ::-webkit-scrollbar { display: none; }
      body { overflow: hidden; margin: 0; padding: 0; }
      html { overflow: hidden; }
    </style>
    ${poll.htmlContent}
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'sendcta') {
        console.log('🟢 CTA button clicked:', message.ctaId);
        sendTrackEvent('cta', message.ctaId);
        sendCustomEvent('sendcta', {
          ctaId: message.ctaId,
          compare: placeholderId,
        });
      }
    } catch (err) {
      console.warn('⚠️ Invalid message from WebView:', err);
    }
  };

  return (
    <View style={styles.container} key={poll?.updatedAt}>
      <WebView
        originWhitelist={['*']}
        source={{ html: injectedHTML }}
        injectedJavaScript={injectedJS}
        onMessage={handleWebViewMessage}
        style={styles.webview}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
  },
  webview: {
    flex: 1,
  },
});
