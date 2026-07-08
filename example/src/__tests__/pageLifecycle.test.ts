import { sendCustomEvent } from 'react-native-mehery-event-sender';
import { PAGE_CONFIGS } from '../constants/pages';
import {
  PAGE_OPEN_DELAY_MS,
  closeExamplePage,
  openExamplePage,
} from '../utils/pageLifecycle';

jest.mock('react-native-mehery-event-sender', () => ({
  sendCustomEvent: jest.fn(),
}));

describe('pageLifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('openExamplePage sends page_open and widget_open after delay', () => {
    const config = PAGE_CONFIGS.home;
    openExamplePage(config);

    expect(sendCustomEvent).not.toHaveBeenCalled();

    jest.advanceTimersByTime(PAGE_OPEN_DELAY_MS);

    expect(sendCustomEvent).toHaveBeenCalledTimes(3);
    expect(sendCustomEvent).toHaveBeenNthCalledWith(1, 'page_open', {
      page: 'home',
    });
    expect(sendCustomEvent).toHaveBeenNthCalledWith(2, 'widget_open', {
      compare: 'RN_home_inline',
    });
    expect(sendCustomEvent).toHaveBeenNthCalledWith(3, 'widget_open', {
      compare: 'RN_home_tooltip',
    });
  });

  it('openExamplePage cleanup cancels pending timer', () => {
    const config = PAGE_CONFIGS.explore;
    const cancel = openExamplePage(config);

    cancel();
    jest.advanceTimersByTime(PAGE_OPEN_DELAY_MS);

    expect(sendCustomEvent).not.toHaveBeenCalled();
  });

  it('closeExamplePage sends page_closed with page name', () => {
    closeExamplePage(PAGE_CONFIGS.account);

    expect(sendCustomEvent).toHaveBeenCalledWith('page_closed', {
      page: 'account',
    });
  });
});
