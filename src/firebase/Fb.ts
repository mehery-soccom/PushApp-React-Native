import messaging from '@react-native-firebase/messaging';
import app from '@react-native-firebase/app';
import { Linking, PermissionsAndroid } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { getDeviceId } from '../utils/device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { getApiBaseUrl } from '../helpers/tenantContext';

import { NativeModules, Platform } from 'react-native';

const { LiveActivityModule } = NativeModules;

let deviceRegistrationInProgress = false;
let lastApiCallTime: number | null = null;
const API_CALL_COOLDOWN_MS = 5000; // 5s cooldown
let foregroundUnsubscribe: null | (() => void) = null;
let openTrackingUnsubscribe: null | (() => void) = null;
let backgroundHandlerRegistered = false;
const seenForegroundMessageIds = new Set<string>();
const FOREGROUND_MESSAGE_CACHE_LIMIT = 50;

console.log('💬 Firebase messaging:', messaging);
console.log('📦 Firebase app exists:', app ? 'Yes' : 'No');

export async function registerDeviceWithFCM(token: string, deviceId: string) {
  if (!token) {
    console.warn('⚠️ No FCM token provided. Skipping registration.');
    return;
  }

  // 🧠 Skip if registration already in progress
  if (deviceRegistrationInProgress) {
    console.log(
      'ℹ️ Registration already in progress — skipping duplicate call.'
    );
    return;
  }

  // 🧊 Cooldown logic to avoid spamming
  const now = Date.now();
  if (lastApiCallTime && now - lastApiCallTime < API_CALL_COOLDOWN_MS) {
    const waitTime = Math.ceil(
      (API_CALL_COOLDOWN_MS - (now - lastApiCallTime)) / 1000
    );
    console.log(`⏳ Cooldown active. Wait ${waitTime}s before retrying.`);
    return;
  }

  deviceRegistrationInProgress = true;

  try {
    const [storedDeviceId, lastRegisteredToken, lastRegisteredState] =
      await AsyncStorage.multiGet([
        'device_id',
        'lastRegisteredToken',
        'lastRegisteredState',
      ]).then((entries) => entries.map(([_, v]) => v));

    console.log('last:', lastRegisteredToken);
    // Generate a fallback device_id if not found
    let finalDeviceId = deviceId || storedDeviceId;
    if (!finalDeviceId) {
      finalDeviceId = `${Platform.OS}_${Date.now()}`;
      await AsyncStorage.setItem('device_id', finalDeviceId);
    }

    // Create state key to check for changes
    const currentState = JSON.stringify({
      token,
      deviceId: finalDeviceId,
      platform: Platform.OS,
    });

    // 🔁 Skip if last registration is identical
    if (lastRegisteredState === currentState) {
      console.log('✅ Registration already valid. Skipping re-register.');
      deviceRegistrationInProgress = false;
      return;
    }

    const channel_id = await AsyncStorage.getItem('mehery_channel_id');

    const payload = {
      device_id: finalDeviceId,
      channel_id: channel_id,
      platform: Platform.OS,
      token: token,
    };

    console.log('📡 Registering device with payload:', payload);
    const commonHeaders = await buildCommonHeaders();

    const apiBaseUrl = await getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/device/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...commonHeaders,
      },
      body: JSON.stringify(payload),
    });
    // const response = await fetch(
    //   'https://demo.pushapp.co.in/pushapp/api/register',
    //   {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payload),
    //   }
    // );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const resData = await response.json();
    console.log('✅ Device registered/updated:', resData);

    lastApiCallTime = Date.now();

    // 🧩 Save new registration state
    await AsyncStorage.multiSet([
      ['lastRegisteredToken', token],
      ['lastRegisteredState', currentState],
      ['isRegistered', 'true'],
    ]);
  } catch (err) {
    console.error('❌ Failed to register/update device:', err);
    await AsyncStorage.setItem('isRegistered', 'false');
  } finally {
    deviceRegistrationInProgress = false;
  }
}

export function requestUserPermission(): void {
  // iOS-style permission
  messaging()
    .requestPermission()
    .then((authStatus) => {
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ iOS-like notification permission granted:', authStatus);
      } else {
        console.warn('❌ iOS-like notification permission denied');
      }
    })
    .catch(() => {
      // Probably not iOS
    });

  // Android POST_NOTIFICATIONS (Android 13+)
  PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
    .then((permission) => {
      if (permission === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Android POST_NOTIFICATIONS permission granted');
      } else {
        console.warn('❌ Android POST_NOTIFICATIONS permission denied');
      }
    })
    .catch(() => {
      // Possibly not Android or permission API not available
    });

  console.log('check perms');
}

const MAX_FCM_TOKEN_RETRIES = 4;
const RETRY_DELAY_MS = 2000;
const MAX_CAROUSEL_IMAGES = 4;

function resolveSingleImageFromData(data: Record<string, any>): string | null {
  const keys = ['image', 'imageUrl', 'image_url'];
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function resolveImageListFromData(data: Record<string, any>): string[] {
  const listKeys = ['imageUrls', 'image_urls', 'carousel_images'];
  for (const key of listKeys) {
    const raw = data?.[key];
    if (!raw) continue;
    try {
      const rawString = typeof raw === 'string' ? raw : JSON.stringify(raw);
      const parsed = JSON.parse(rawString);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean);
        if (normalized.length > 0) {
          return normalized;
        }
      }
    } catch (_err) {}
  }

  const indexed: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const value = data?.[`image${i}`];
    if (typeof value !== 'string') {
      if (i === 1) continue;
      break;
    }
    const trimmed = value.trim();
    if (trimmed) indexed.push(trimmed);
  }
  return indexed;
}

function normalizedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

type ForegroundCtaPair = { title: string; url: string };

function parseCtaButtonsJson(raw: unknown): ForegroundCtaPair[] {
  if (raw == null) return [];
  let text = '';
  if (typeof raw === 'string') {
    text = raw.trim();
  } else {
    try {
      text = JSON.stringify(raw);
    } catch {
      return [];
    }
  }
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    const arr: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as { buttons?: unknown }).buttons)
        ? ((parsed as { buttons: unknown[] }).buttons as unknown[])
        : parsed &&
            typeof parsed === 'object' &&
            Array.isArray((parsed as { items?: unknown }).items)
          ? ((parsed as { items: unknown[] }).items as unknown[])
          : [];
    const labelKeys = ['title', 'label', 'text', 'name', 'buttonTitle'];
    const urlKeys = [
      'url',
      'link',
      'href',
      'deepLink',
      'deeplink',
      'targetUrl',
    ];
    const out: ForegroundCtaPair[] = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const title = labelKeys
        .map((k) => normalizedString(o[k]))
        .find((s) => s.length > 0);
      const url = urlKeys
        .map((k) => normalizedString(o[k]))
        .find((s) => s.length > 0);
      if (title && url) out.push({ title, url });
      if (out.length >= 3) break;
    }
    return out;
  } catch {
    return [];
  }
}

function extractForegroundCtaPairs(
  data: Record<string, any>
): ForegroundCtaPair[] {
  const fromButtons = parseCtaButtonsJson(data.cta_buttons);
  if (fromButtons.length > 0) return fromButtons;
  const pairs: ForegroundCtaPair[] = [];
  const add = (titleKey: string, urlKey: string) => {
    const title = normalizedString(data[titleKey]);
    const url = normalizedString(data[urlKey]);
    if (title && url) pairs.push({ title, url });
  };
  add('title1', 'url1');
  add('title2', 'url2');
  add('title3', 'url3');
  return pairs;
}

function shouldUseNativeStyledPath(data: Record<string, any>): boolean {
  const hasLiveTriplet =
    normalizedString(data.message1) &&
    normalizedString(data.message2) &&
    normalizedString(data.message3);
  if (hasLiveTriplet) return true;
  const styleKeys = [
    'tapText',
    'titleColorHex',
    'messageColorHex',
    'tapTextColorHex',
    'backgroundColorHex',
    'bg_color_gradient',
    'bg_color_gradient_dir',
    'align',
    'progressPercent',
    'progressColorHex',
  ];
  return styleKeys.some((k) => normalizedString(data[k]));
}

function getPushTrackBaseUrl(data: Record<string, any>): string {
  const explicit = normalizedString(data.track_base_url);
  if (explicit) return explicit;
  const apiBase = normalizedString(data.api_base_url);
  if (apiBase) return apiBase;
  return '';
}

async function trackPushEvent(
  eventType: 'received' | 'opened' | 'cta',
  data: Record<string, any>,
  ctaId?: string
): Promise<void> {
  const baseUrl = getPushTrackBaseUrl(data);
  if (!baseUrl) return;

  const payload: Record<string, any> = {
    event: eventType,
  };
  const messageId = normalizedString(data.messageId || data.message_id);
  const filterId = normalizedString(data.filterId || data.filter_id);
  const notificationId = normalizedString(data.notification_id);
  if (messageId) payload.messageId = messageId;
  if (filterId) payload.filterId = filterId;
  if (notificationId) payload.notificationId = notificationId;
  if (ctaId) payload.data = { ctaId };

  try {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/notification/push/track`;
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.log('[PushTrack] non-blocking track failed:', eventType, err);
  }
}

function ensureBackgroundMessageHandlerRegistered(): void {
  if (backgroundHandlerRegistered) return;
  backgroundHandlerRegistered = true;
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    const data = remoteMessage?.data || {};
    await trackPushEvent('received', data);
  });
}

function isRetryableFcmError(error: unknown): boolean {
  const msg = String(
    (error as { message?: string })?.message ?? error ?? ''
  ).toLowerCase();
  return (
    msg.includes('service_not_available') ||
    msg.includes('timeout') ||
    msg.includes('internal_error') ||
    msg.includes('network')
  );
}

/**
 * Get the current device's FCM token with retry logic.
 * SERVICE_NOT_AVAILABLE is often transient; we retry with exponential backoff.
 */
export async function getFcmToken(): Promise<string | null> {
  for (let attempt = 1; attempt <= MAX_FCM_TOKEN_RETRIES; attempt++) {
    try {
      const token = await messaging().getToken();
      if (token) {
        console.log('📲 FCM Token:', token);
        const id = await getDeviceId();
        console.log('✅ Device is being registered with ID:', id);
        await AsyncStorage.setItem('device_id', id);
        await registerDeviceWithFCM(token, id);
        return token;
      }
    } catch (error) {
      const retryable = isRetryableFcmError(error);
      console.error(
        `Error getting FCM token (attempt ${attempt}/${MAX_FCM_TOKEN_RETRIES}):`,
        error
      );

      if (attempt < MAX_FCM_TOKEN_RETRIES && retryable) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error('❌ Failed to get FCM token after retries.');
        return null;
      }
    }
  }
  return null;
}

/**
 * Configure push notifications
 */
export function configurePushNotifications(): void {
  ensureBackgroundMessageHandlerRegistered();

  PushNotification.configure({
    onNotification: async function (notification: any) {
      console.log('🔔 LOCAL NOTIFICATION:', notification);
      const notificationData = (notification?.data ||
        notification?.userInfo ||
        {}) as Record<string, any>;
      await trackPushEvent('opened', notificationData);
      const action = notification?.action;
      if (!action) return;

      const actionMapRaw =
        notification?.data?.__actionMap ||
        notification?.userInfo?.__actionMap ||
        notification?.__actionMap;
      if (!actionMapRaw) return;

      try {
        const actionMap = JSON.parse(String(actionMapRaw));
        const targetUrl = actionMap?.[action];
        await trackPushEvent('cta', notificationData, String(action));
        if (typeof targetUrl === 'string' && targetUrl.trim()) {
          console.log(`🔗 Opening action URL for "${action}":`, targetUrl);
          await Linking.openURL(targetUrl.trim());
        }
      } catch (err) {
        console.warn('⚠️ Failed to handle notification action URL:', err);
      }
    },
    popInitialNotification: true,
    requestPermissions: false,
  });

  PushNotification.createChannel(
    {
      channelId: 'default-channel-id',
      channelName: 'Default Channel',
      channelDescription: 'Used for default notifications',
      importance: 4,
      vibrate: true,
    },
    (created: boolean) =>
      console.log(`📡 Notification channel created: ${created}`)
  );
}

/**
 * Setup foreground listener
 */
// export function setupForegroundNotificationListener(): () => void {
//   const unsubscribe = messaging().onMessage((remoteMessage) => {
//     console.log('📨 Foreground FCM message:', JSON.stringify(remoteMessage));

//     const title =
//       remoteMessage.notification?.title ||
//       remoteMessage.data?.title ||
//       'Notification';

//     const message =
//       remoteMessage.notification?.body ||
//       remoteMessage.data?.body ||
//       'You have a new message';

//     console.log('📲 Displaying local notification:', title, message);

//     PushNotification.localNotification({
//       channelId: 'default-channel-id',
//       title,
//       message,
//       playSound: true,
//       soundName: 'default',
//       importance: 'high',
//       vibrate: true,
//     });
//   });

//   return unsubscribe;
// }

export function setupForegroundNotificationListener(): () => void {
  if (foregroundUnsubscribe) {
    console.log('ℹ️ Foreground notification listener already active');
    return foregroundUnsubscribe;
  }

  const unsubscribe = messaging().onMessage((remoteMessage) => {
    console.log('📨 Foreground FCM message:', JSON.stringify(remoteMessage));
    const messageId = remoteMessage.messageId || '';
    if (messageId && seenForegroundMessageIds.has(messageId)) {
      console.log('⏭️ Duplicate foreground message ignored:', messageId);
      return;
    }
    if (messageId) {
      seenForegroundMessageIds.add(messageId);
      if (seenForegroundMessageIds.size > FOREGROUND_MESSAGE_CACHE_LIMIT) {
        const oldest = seenForegroundMessageIds.values().next().value as
          | string
          | undefined;
        if (oldest) seenForegroundMessageIds.delete(oldest);
      }
    }

    const data = remoteMessage.data || {};
    trackPushEvent('received', data).catch(() => undefined);

    const title =
      remoteMessage.notification?.title || data.title || 'Notification';

    const message =
      remoteMessage.notification?.body || data.body || 'You have a new message';

    const image =
      remoteMessage.notification?.android?.imageUrl ||
      remoteMessage.notification?.image ||
      resolveSingleImageFromData(data) ||
      null;

    const carouselImages = resolveImageListFromData(data).slice(
      0,
      MAX_CAROUSEL_IMAGES
    );
    if (carouselImages.length > 0) {
      console.log('🖼️ Carousel images parsed:', carouselImages);
    }

    if (carouselImages.length > 0) {
      console.log('🚀 Triggering Carousel Live Activity...');
      if (Platform.OS === 'android' && LiveActivityModule?.triggerCarousel) {
        LiveActivityModule.triggerCarousel({
          title,
          message,
          images: carouselImages,
        });
        return;
      }
    }

    if (
      Platform.OS === 'android' &&
      shouldUseNativeStyledPath(data) &&
      LiveActivityModule?.triggerLiveActivity
    ) {
      LiveActivityModule.triggerLiveActivity(data);
      return;
    }

    if (Platform.OS === 'android') {
      console.log(
        '📲 Showing Android foreground JS local notification (plain payload path).'
      );
    }
    console.log('📲 Displaying local notification:', title, message, image);

    const localNotif: any = {
      channelId: 'default-channel-id',
      title,
      message,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      vibrate: true,
    };

    const actionPairs = extractForegroundCtaPairs(data);

    if (actionPairs.length > 0) {
      const actionTitles = actionPairs.map((item) => item.title as string);
      const actionMap = actionPairs.reduce(
        (acc, item) => {
          acc[item.title as string] = item.url as string;
          return acc;
        },
        {} as Record<string, string>
      );
      const actionMapJson = JSON.stringify(actionMap);

      localNotif.actions = actionTitles;
      localNotif.invokeApp = true;
      localNotif.__actionMap = actionMapJson;
      localNotif.userInfo = {
        ...(localNotif.userInfo || {}),
        __actionMap: actionMapJson,
      };
      localNotif.data = {
        ...(data as Record<string, string>),
        __actionMap: actionMapJson,
      };
    }

    if (image) {
      // react-native-push-notification big-picture style
      localNotif.bigPictureUrl = image;
      localNotif.picture = image;
      localNotif.largeIconUrl = image;
    }

    PushNotification.localNotification(localNotif);
  });

  foregroundUnsubscribe = () => {
    unsubscribe();
    foregroundUnsubscribe = null;
    seenForegroundMessageIds.clear();
  };

  return foregroundUnsubscribe;
}

export function setupNotificationOpenTracking(): () => void {
  if (openTrackingUnsubscribe) return openTrackingUnsubscribe;

  const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
    const data = remoteMessage?.data || {};
    trackPushEvent('opened', data).catch(() => undefined);
  });

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage?.data) {
        trackPushEvent('opened', remoteMessage.data).catch(() => undefined);
      }
    })
    .catch(() => undefined);

  openTrackingUnsubscribe = () => {
    unsubscribe();
    openTrackingUnsubscribe = null;
  };

  return openTrackingUnsubscribe;
}

// Fb.ts or Fb.js

// export const requestUserPermission = () => {
//   console.log('Requesting permission...');
// };

// export const getFcmToken = () => {
//   console.log('Getting FCM token...');
// };

// export const configurePushNotifications = () => {
//   console.log('Configuring push notifications...');
// };

// export const setupForegroundNotificationListener = () => {
//   console.log('Setting up foreground listener...');
// };
