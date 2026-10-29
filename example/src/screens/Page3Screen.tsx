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
import {
  updatePushToken,
  updateUserProfile,
} from 'react-native-mehery-event-sender';
import { PAGE_CONFIGS } from '../constants/pages';
import { PageCtaButtons } from '../components/PageCtaButtons';
import {
  PageInlinePollPlaceholder,
  PageTooltipPollPlaceholder,
} from '../components/PagePollPlaceholders';
import {
  buildProfilePayload,
  getProfileName,
  setProfileName,
} from '../utils/cartStorage';
import { loadPushTokens } from '../utils/pushTokens';
import { closeExamplePage, openExamplePage } from '../utils/pageLifecycle';
import { DEEP_LINK_URLS } from '../utils/deepLinks';
import { appStyles } from '../styles/appStyles';

type Page3ScreenProps = {
  userId: string;
  profileStatus: string | null;
  onProfileSync: (status: string) => void;
  onLogout: () => void;
};

const config = PAGE_CONFIGS.account;

export function Page3Screen({
  userId,
  profileStatus,
  onProfileSync,
  onLogout,
}: Page3ScreenProps) {
  const [nameDraft, setNameDraft] = useState('');
  const [savedName, setSavedName] = useState('');
  const [savingName, setSavingName] = useState(false);
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
      if (cancelled) return;
      setSavedName(name);
      setNameDraft(name);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const nameChanged = nameDraft.trim() !== savedName.trim();

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (savingName || trimmed === savedName.trim()) return;

    setSavingName(true);
    onProfileSync('Saving name and updating profile…');
    try {
      await setProfileName(trimmed);
      setSavedName(trimmed);
      setNameDraft(trimmed);
      const result = await updateUserProfile(await buildProfilePayload());
      onProfileSync(
        result.skipped
          ? `Name saved — profile sync skipped. ${result.message}`
          : `Name saved — profile sync sent. ${result.message}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      onProfileSync(`Name saved locally — profile sync failed: ${message}`);
    } finally {
      setSavingName(false);
    }
  };

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
          Name is stored on this device. Saving a different name updates the
          profile.
        </Text>
        <TextInput
          style={appStyles.input}
          placeholder="Your name"
          value={nameDraft}
          onChangeText={setNameDraft}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!savingName}
          returnKeyType="done"
          onSubmitEditing={handleSaveName}
        />
        <Button
          title={savingName ? 'Saving name…' : 'Save name'}
          onPress={handleSaveName}
          disabled={savingName || !nameChanged}
        />
        <Text style={appStyles.profileHint}>
          Profile also syncs on home load, cart changes, and Place Order with
          registration_completed, total_orders, and latest_cart_value.
        </Text>
        {profileStatus ? (
          <Text style={appStyles.profileStatus}>{profileStatus}</Text>
        ) : null}
      </View>

      <View style={appStyles.profileSection}>
        <Text style={appStyles.label}>Deep links</Text>
        <Text style={appStyles.profileHint}>{DEEP_LINK_URLS.home}</Text>
        <Text style={appStyles.profileHint}>{DEEP_LINK_URLS.explore}</Text>
        <Text style={appStyles.profileHint}>{DEEP_LINK_URLS.account}</Text>
        <Text style={appStyles.profileHint}>
          Open while logged in to switch tabs. Cold start from a link opens that
          tab after sign-in.
        </Text>
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
