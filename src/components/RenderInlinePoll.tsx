import { WebView } from 'react-native-webview';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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
      // If not registered in memory, try AsyncStorage
      if (!inlinePollRegistry[placeholderId]) {
        try {
          const backup = await AsyncStorage.getItem(
            `inline_poll_${placeholderId}`
          );
          if (backup) {
            const parsed = JSON.parse(backup);
            setPoll(parsed);
          } else {
            // ❌ Not found anywhere: remove stale storage just in case
            await AsyncStorage.removeItem(`inline_poll_${placeholderId}`);
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

  // Send event when poll is rendered
  useEffect(() => {
    if (poll?.htmlContent) {
      console.log('inline poll rendered:', placeholderId);
      try {
        sendCustomEvent('widget_open', { compare: placeholderId });
      } catch (error) {
        console.log('err:', error);
      }
    } else {
      // ❌ Poll does not exist, remove from AsyncStorage
      AsyncStorage.removeItem(`inline_poll_${placeholderId}`).catch(() => {});
    }
  }, [placeholderId, poll]);

  if (!poll?.htmlContent) return null;

  const injectedHTML = `
    <style>
      ::-webkit-scrollbar { display: none; }
      body { -ms-overflow-style: none; scrollbar-width: none; overflow: hidden; margin: 0; padding: 0; }
      html { overflow: hidden; }
    </style>
    ${poll.htmlContent}
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: injectedHTML }}
        style={styles.webview}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 150,
  },
  webview: {
    flex: 1,
    // backgroundColor: 'white',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: '#00000080',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 22,
  },
});
