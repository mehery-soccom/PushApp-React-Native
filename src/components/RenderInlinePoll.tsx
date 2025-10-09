import { WebView } from 'react-native-webview';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendCustomEvent } from '../events/custom/CustomEvents';

const inlinePollRegistry: Record<string, any> = {};

export async function renderInlinePoll(
  placeholderId: string,
  htmlContent: string,
  style: any
) {
  inlinePollRegistry[placeholderId] = { htmlContent, style };

  try {
    await AsyncStorage.setItem(
      `inline_poll_${placeholderId}`,
      JSON.stringify({ htmlContent, style })
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
    const loadBackup = async () => {
      if (!inlinePollRegistry[placeholderId]) {
        try {
          const backup = await AsyncStorage.getItem(
            `inline_poll_${placeholderId}`
          );
          if (backup) {
            const parsed = JSON.parse(backup);
            setPoll(parsed);
          }
        } catch (err) {
          console.warn('[SDK] Failed to load inline poll backup', err);
        }
      } else {
        setPoll(inlinePollRegistry[placeholderId]);
      }
    };
    loadBackup();
  }, [placeholderId]);

  useEffect(() => {
    console.log('inline poll rendered:', placeholderId);
    try {
      sendCustomEvent('widget_open', { compare: placeholderId });
    } catch (error) {}
  }, [placeholderId]);

  if (!poll?.htmlContent) return null;

  // ✅ Inject CSS to hide scrollbars in HTML content
  const injectedHTML = `
    <style>
      ::-webkit-scrollbar { display: none; }
      body { -ms-overflow-style: none; scrollbar-width: none; overflow: hidden; margin: 0; padding: 0; }
      html { overflow: hidden; }
    </style>
    ${poll.htmlContent}
  `;

  return (
    <View style={{ height: 300 }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: injectedHTML }}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false} // ✅ Disable scroll gestures entirely
      />
    </View>
  );
}
