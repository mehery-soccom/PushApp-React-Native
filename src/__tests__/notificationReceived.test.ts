jest.mock('../events/custom/CustomEvents', () => ({
  sendCustomEvent: jest.fn(),
}));

jest.mock('../helpers/sdkLogger', () => ({
  sdkLog: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { sendCustomEvent } from '../events/custom/CustomEvents';
import { SDK_EVENT_NAMES } from '../events/default/eventNames';
import {
  __resetNotificationReceivedDedupeForTests,
  trackNotificationReceived,
} from '../events/default/notificationReceived';

describe('trackNotificationReceived', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetNotificationReceivedDedupeForTests();
    (sendCustomEvent as jest.Mock).mockResolvedValue(true);
  });

  it('sends notification_received when a push is delivered', async () => {
    const sent = await trackNotificationReceived({
      messageId: 'm-1',
      notification_id: 'n-1',
      filterId: 'f-1',
      title: 'Hello',
      body: 'World',
    });

    expect(sent).toBe(true);
    expect(sendCustomEvent).toHaveBeenCalledWith(
      SDK_EVENT_NAMES.NOTIFICATION_RECEIVED,
      {
        message_id: 'm-1',
        notification_id: 'n-1',
        filter_id: 'f-1',
        title: 'Hello',
        body: 'World',
      },
      { eventType: 'LOG' }
    );
  });

  it('sends once when the same message is delivered again', async () => {
    await trackNotificationReceived({ 'gcm.message_id': 'm-1', title: 'Hi' });
    const second = await trackNotificationReceived({
      messageId: 'm-1',
      title: 'Hi',
    });

    expect(second).toBe(false);
    expect(sendCustomEvent).toHaveBeenCalledTimes(1);
  });

  it('does not send for silent keep-alives', async () => {
    const sent = await trackNotificationReceived({
      type: 'silent_keepalive',
      messageId: 'ping-1',
    });

    expect(sent).toBe(false);
    expect(sendCustomEvent).not.toHaveBeenCalled();
  });

  it('reads title from a nested data blob', async () => {
    await trackNotificationReceived({
      data: { title: 'Nested', body: 'Body', messageId: 'm-2' },
    });

    expect(sendCustomEvent).toHaveBeenCalledWith(
      SDK_EVENT_NAMES.NOTIFICATION_RECEIVED,
      {
        message_id: 'm-2',
        title: 'Nested',
        body: 'Body',
      },
      { eventType: 'LOG' }
    );
  });
});
