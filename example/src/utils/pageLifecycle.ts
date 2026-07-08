import { sendCustomEvent } from 'react-native-mehery-event-sender';
import type { PageConfig } from '../constants/pages';

const PAGE_OPEN_DELAY_MS = 2000;

export function openExamplePage(config: PageConfig): () => void {
  const timer = setTimeout(() => {
    try {
      sendCustomEvent('page_open', { page: config.pageName });
      sendCustomEvent('widget_open', { compare: config.inlinePlaceholderId });
      sendCustomEvent('widget_open', { compare: config.tooltipPlaceholderId });
    } catch (error) {
      console.warn('[Example] openExamplePage failed:', error);
    }
  }, PAGE_OPEN_DELAY_MS);

  return () => clearTimeout(timer);
}

export function closeExamplePage(config: PageConfig): void {
  try {
    sendCustomEvent('page_closed', { page: config.pageName });
  } catch (error) {
    console.warn('[Example] closeExamplePage failed:', error);
  }
}

export { PAGE_OPEN_DELAY_MS };
