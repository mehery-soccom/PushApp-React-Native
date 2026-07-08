import { Button, View } from 'react-native';
import { sendCustomEvent } from 'react-native-mehery-event-sender';
import type { PageConfig } from '../constants/pages';
import { appStyles } from '../styles/appStyles';

type PageCtaButtonsProps = {
  config: PageConfig;
};

export function PageCtaButtons({ config }: PageCtaButtonsProps) {
  return (
    <View style={appStyles.customEventButtons}>
      {config.ctas.map((cta, index) => (
        <View key={cta.id}>
          {index > 0 ? <View style={appStyles.customEventButtonSpacer} /> : null}
          <Button
            title={cta.label}
            onPress={() => {
              sendCustomEvent(cta.event, {
                page: config.pageName,
                ctaId: cta.id,
              });
            }}
          />
        </View>
      ))}
    </View>
  );
}
