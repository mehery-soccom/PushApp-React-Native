import { Text, View } from 'react-native';
import {
  InlinePollContainer,
  TooltipPollContainer,
} from 'react-native-mehery-event-sender';
import type { PageConfig } from '../constants/pages';
import { appStyles } from '../styles/appStyles';

type PagePollPlaceholderProps = {
  config: PageConfig;
};

/** Inline poll slot — mount at the top of each page ScrollView. */
export function PageInlinePollPlaceholder({ config }: PagePollPlaceholderProps) {
  return (
    <View style={appStyles.inlinePollSection}>
      <Text style={appStyles.placeholderLabel}>
        Inline placeholder: {config.inlinePlaceholderId}
      </Text>
      <InlinePollContainer placeholderId={config.inlinePlaceholderId} />
    </View>
  );
}

/** Tooltip poll anchor — mount at the bottom of each page ScrollView. */
export function PageTooltipPollPlaceholder({
  config,
}: PagePollPlaceholderProps) {
  return (
    <View style={appStyles.tooltipPollSection}>
      <Text style={appStyles.placeholderLabel}>
        Tooltip placeholder: {config.tooltipPlaceholderId}
      </Text>
      <View style={appStyles.tooltipAnchorWrap}>
        <TooltipPollContainer placeholderId={config.tooltipPlaceholderId}>
          <View style={appStyles.vex} />
        </TooltipPollContainer>
      </View>
    </View>
  );
}

/** Convenience wrapper when both slots belong together (e.g. tests). */
export function PagePollPlaceholders({ config }: PagePollPlaceholderProps) {
  return (
    <>
      <PageInlinePollPlaceholder config={config} />
      <PageTooltipPollPlaceholder config={config} />
    </>
  );
}
