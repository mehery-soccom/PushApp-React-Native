import { Pressable, Text, View } from 'react-native';
import {
  PAGE_CONFIGS,
  PAGE_ORDER,
  type PageId,
} from '../constants/pages';
import { appStyles } from '../styles/appStyles';

type BottomTabBarProps = {
  activePageId: PageId;
  onSelect: (pageId: PageId) => void;
};

export function BottomTabBar({ activePageId, onSelect }: BottomTabBarProps) {
  return (
    <View style={appStyles.tabBar}>
      {PAGE_ORDER.map((pageId) => {
        const config = PAGE_CONFIGS[pageId];
        const isActive = pageId === activePageId;

        return (
          <Pressable
            key={pageId}
            style={[appStyles.tabItem, isActive ? appStyles.tabItemActive : null]}
            onPress={() => onSelect(pageId)}
          >
            <Text
              style={[appStyles.tabLabel, isActive ? appStyles.tabLabelActive : null]}
            >
              {config.tabLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
