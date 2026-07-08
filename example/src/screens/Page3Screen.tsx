import { useEffect, useState } from 'react';
import messaging from '@react-native-firebase/messaging';
import {
  ScrollView,
  Text,
  TextInput,
  Button,
  View,
  Platform,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';
import { updatePushToken } from 'react-native-mehery-event-sender';
import { PAGE_CONFIGS } from '../constants/pages';
import { PageCtaButtons } from '../components/PageCtaButtons';
import {
  PageInlinePollPlaceholder,
  PageTooltipPollPlaceholder,
} from '../components/PagePollPlaceholders';
import { getProfileName } from '../utils/cartStorage';
import { loadPushTokens } from '../utils/pushTokens';
import { closeExamplePage, openExamplePage } from '../utils/pageLifecycle';
import { appStyles } from '../styles/appStyles';

type Page3ScreenProps = {
  userId: string;
  profileStatus: string | null;
  onLogout: () => void;
};

const config = PAGE_CONFIGS.account;

export function Page3Screen({
  userId,
  profileStatus,
  onLogout,
}: Page3ScreenProps) {
  const [storedName, setStoredName] = useState('');
  const [apnsToken, setApnsToken] = useState('');
  const [fcmToken, setFcmToken] = useState('');
  const [tokensLoading, setTokensLoading] = useState(true);

  useEffect(() => {
    const cancelOpen = openExamplePage(config);
    return () => {
      cancelOpen();
      closeExamplePage(config);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const { PushTokenManager } = NativeModules;
    let pushSubscription: { remove: () => void } | null = null;

    const refreshTokens = async () => {
      const tokens = await loadPushTokens();
      if (cancelled) return;
      setApnsToken(tokens.apnsToken);
      setFcmToken(tokens.fcmToken);
      setTokensLoading(false);
    };

    refreshTokens();

    if (Platform.OS === 'ios' && PushTokenManager) {
      const pushEmitter = new NativeEventEmitter(PushTokenManager);
      pushSubscription = pushEmitter.addListener(
        'PushTokenEvent',
        ({ type, token }: { type: string; token: string }) => {
          if (type === 'apns') {
            setApnsToken(token);
          } else if (type === 'fcm') {
            setFcmToken(token);
          }
          setTokensLoading(false);
        }
      );
    }

    const pollInterval = setInterval(refreshTokens, 1500);
    const stopPolling = setTimeout(() => clearInterval(pollInterval), 15000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      clearTimeout(stopPolling);
      pushSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getProfileName().then((name) => {
      if (!cancelled) setStoredName(name);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleUpdateToken = async () => {
    try {
      const token = await messaging().getToken();
      if (token) {
        await updatePushToken(token);
        console.log('[Example] updatePushToken called with current token');
      } else {
        console.warn('[Example] No token available');
      }
    } catch (e) {
      console.warn('[Example] Update token failed', e);
    }
  };

  return (
    <ScrollView
      style={appStyles.scroll}
      contentContainerStyle={appStyles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <PageInlinePollPlaceholder config={config} />
      <Text style={appStyles.sectionTitle}>Account</Text>
      <Text style={appStyles.txt}>User ID: {userId}</Text>

      <View style={appStyles.profileSection}>
        <Text style={appStyles.label}>Profile</Text>
        <Text style={appStyles.profileHint}>
          Name: {storedName.trim() ? storedName : 'No name set'}
        </Text>
        <Text style={appStyles.profileHint}>
          Profile syncs automatically on home load and after Place Order with
          registration_completed, total_orders, and latest-cart-value.
        </Text>
        {profileStatus ? (
          <Text style={appStyles.profileStatus}>{profileStatus}</Text>
        ) : null}
      </View>

      <View style={appStyles.tokenSection}>
        <Text style={appStyles.label}>Push tokens</Text>
        <Text style={appStyles.tokenHint}>
          Tap a field, select all, then copy. Values refresh for ~15s after
          login.
        </Text>

        {Platform.OS === 'ios' ? (
          <>
            <Text style={appStyles.tokenLabel}>APNS token</Text>
            <TextInput
              style={appStyles.tokenInput}
              value={
                tokensLoading && !apnsToken
                  ? 'Waiting for APNS token…'
                  : apnsToken || 'APNS token not available'
              }
              editable={false}
              multiline
              selectTextOnFocus
            />
          </>
        ) : (
          <Text style={appStyles.tokenHint}>APNS token: N/A on Android</Text>
        )}

        <Text style={appStyles.tokenLabel}>FCM token</Text>
        <TextInput
          style={appStyles.tokenInput}
          value={
            tokensLoading && !fcmToken
              ? 'Waiting for FCM token…'
              : fcmToken || 'FCM token not available'
          }
          editable={false}
          multiline
          selectTextOnFocus
        />
        <View style={appStyles.customEventButtonSpacer} />
        <Button title="Update Token" onPress={handleUpdateToken} />
      </View>

      <PageCtaButtons config={config} />
      <View style={appStyles.customEventButtonSpacer} />
      <Button title="Logout" onPress={onLogout} />
      <PageTooltipPollPlaceholder config={config} />
    </ScrollView>
  );
}
