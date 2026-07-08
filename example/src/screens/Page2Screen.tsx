import { useEffect } from 'react';
import { ScrollView, Text } from 'react-native';
import { PAGE_CONFIGS } from '../constants/pages';
import { PageCtaButtons } from '../components/PageCtaButtons';
import {
  PageInlinePollPlaceholder,
  PageTooltipPollPlaceholder,
} from '../components/PagePollPlaceholders';
import { closeExamplePage, openExamplePage } from '../utils/pageLifecycle';
import { appStyles } from '../styles/appStyles';

const config = PAGE_CONFIGS.explore;

export function Page2Screen() {
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
      <Text style={appStyles.sectionTitle}>Explore</Text>
      <Text style={appStyles.bodyText}>
        Demo page for in-app polls. Placeholders: {config.inlinePlaceholderId},{' '}
        {config.tooltipPlaceholderId}.
      </Text>
      <Text style={appStyles.bodyText}>
        Tap the CTAs below to send page-specific events and trigger poll checks.
      </Text>
      <PageCtaButtons config={config} />
      <PageTooltipPollPlaceholder config={config} />
    </ScrollView>
  );
}
