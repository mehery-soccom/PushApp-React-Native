import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  OnUserLogin,
  sendCustomEvent,
  updateUserProfile,
} from 'react-native-mehery-event-sender';
import { EVENT_NAMES } from '../constants/events';
import {
  DEFAULT_PAGE_ID,
  PAGE_CONFIGS,
  type PageId,
} from '../constants/pages';
import { BottomTabBar } from '../components/BottomTabBar';
import { Page1Screen } from './Page1Screen';
import { Page2Screen } from './Page2Screen';
import { Page3Screen } from './Page3Screen';
import {
  buildProfilePayload,
  getProfileName,
} from '../utils/cartStorage';
import { closeExamplePage } from '../utils/pageLifecycle';
import { appStyles } from '../styles/appStyles';

type PostLoginShellProps = {
  userId: string;
  pendingAuthEvent: 'signIn' | 'signUp' | null;
  onAuthEventSent: () => void;
  onLogout: () => void;
};

export function PostLoginShell({
  userId,
  pendingAuthEvent,
  onAuthEventSent,
  onLogout,
}: PostLoginShellProps) {
  const [activePageId, setActivePageId] = useState<PageId>(DEFAULT_PAGE_ID);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [bootstrapDone, setBootstrapDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const loginResult = await OnUserLogin(userId);
        if (cancelled) return;

        if (!loginResult.success) {
          setProfileStatus(
            `Device link failed: ${loginResult.error ?? 'unknown error'}`
          );
          setBootstrapDone(true);
          return;
        }

        if (pendingAuthEvent === 'signUp') {
          const name = await getProfileName();
          sendCustomEvent(EVENT_NAMES.signUp, { code: userId, name });
        } else if (pendingAuthEvent === 'signIn') {
          sendCustomEvent(EVENT_NAMES.logIn, { code: userId });
        }
        onAuthEventSent();

        if (cancelled) return;

        setProfileStatus('Updating profile on home load…');
        const result = await updateUserProfile(await buildProfilePayload());
        if (cancelled) return;

        setProfileStatus(
          result.skipped
            ? `Home profile sync — skipped. ${result.message}`
            : `Home profile sync — sent. ${result.message}`
        );
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setProfileStatus(`Profile sync failed: ${message}`);
        console.log('error in post-login bootstrap:', error);
      } finally {
        if (!cancelled) setBootstrapDone(true);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [userId, pendingAuthEvent, onAuthEventSent]);

  const handleLogout = () => {
    closeExamplePage(PAGE_CONFIGS[activePageId]);
    onLogout();
  };

  const renderActivePage = () => {
    if (!bootstrapDone) {
      return null;
    }

    switch (activePageId) {
      case 'home':
        return (
          <Page1Screen userId={userId} onProfileSync={setProfileStatus} />
        );
      case 'explore':
        return <Page2Screen />;
      case 'account':
        return (
          <Page3Screen
            userId={userId}
            profileStatus={profileStatus}
            onLogout={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={appStyles.shell}>
      {renderActivePage()}
      <BottomTabBar activePageId={activePageId} onSelect={setActivePageId} />
    </View>
  );
}
