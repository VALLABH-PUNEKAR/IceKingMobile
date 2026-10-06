import notifee, { AndroidImportance } from '@notifee/react-native';

/**
 * Requests notification permission (required on iOS always, and on
 * Android 13+ / API 33+). Call this once, e.g. on app start or right
 * before the first generate-and-notify action.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1; // AUTHORIZED or PROVISIONAL
}

/**
 * Displays the generated notification text as a real local notification
 * on the device. title is static/app-controlled; body is the sanitized
 * SLM output from textSanitizer.ts.
 */
export async function dispatchLocalNotification(title: string, body: string): Promise<void> {
  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default channel',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId,
      pressAction: { id: 'default' },
    },
  });
}
