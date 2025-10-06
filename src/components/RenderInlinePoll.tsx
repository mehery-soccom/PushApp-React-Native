// SDK SIDE
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
  // Save to registry
  inlinePollRegistry[placeholderId] = { htmlContent, style };

  // ✅ Store HTML locally as backup
  try {
    await AsyncStorage.setItem(
      `inline_poll_${placeholderId}`,
      JSON.stringify({ htmlContent, style })
    );
  } catch (err) {
    console.warn('[SDK] Failed to save inline poll locally', err);
  }
}

// 🔹 Inline container component
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
  }, []);

  if (!poll?.htmlContent) return null;

  return (
    <View style={{ flex: 1 }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: poll.htmlContent }}
        style={{ flex: 1 }}
      />
    </View>
  );
}
