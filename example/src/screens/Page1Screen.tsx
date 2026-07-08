import { useEffect } from 'react';
import { ScrollView, Text } from 'react-native';
import { PAGE_CONFIGS } from '../constants/pages';
import { CartSection } from '../components/CartSection';
import { EventTester } from '../components/EventTester';
import { PageCtaButtons } from '../components/PageCtaButtons';
import {
  PageInlinePollPlaceholder,
  PageTooltipPollPlaceholder,
} from '../components/PagePollPlaceholders';
import { closeExamplePage, openExamplePage } from '../utils/pageLifecycle';
import { appStyles } from '../styles/appStyles';

type Page1ScreenProps = {
  userId: string;
  onProfileSync: (status: string) => void;
};

const config = PAGE_CONFIGS.home;

export function Page1Screen({ userId, onProfileSync }: Page1ScreenProps) {
  useEffect(() => {
    const cancelOpen = openExamplePage(config);
    return () => {
      cancelOpen();
      closeExamplePage(config);
    };
  }, []);

  return (
    <ScrollView
      style={appStyles.scroll}
      contentContainerStyle={appStyles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <PageInlinePollPlaceholder config={config} />
      <Text style={appStyles.txt}>User ID: {userId}</Text>
      <CartSection onProfileSync={onProfileSync} />
      <EventTester />
      <PageCtaButtons config={config} />
      <PageTooltipPollPlaceholder config={config} />
    </ScrollView>
  );
}
