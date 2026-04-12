import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';

// Configure notification handler behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Request Permissions ──────────────────────────────────────────────────────
/**
 * Ensure notification permission is granted. Sets up Android channels and
 * persists the enabled flag. Returns whether local notifications can fire.
 * Push token acquisition is a separate, optional concern (remote push only).
 */
export async function ensureNotificationPermission() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fittrack-default', {
      name: 'FitTrack Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366F1',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('fittrack-progress', {
      name: 'FitTrack Progress Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#10B981',
    });
  }

  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'true');
  return true;
}

/**
 * Get an Expo push token for remote push. Requires a physical device.
 * Safe to call after permission is granted; returns null on simulator or error.
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;
  const granted = await ensureNotificationPermission();
  if (!granted) return null;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: 'f9dd5026-b73f-4f2e-aa49-19382c7f5d1a',
    });
    return token;
  } catch {
    return null;
  }
}

// ─── Schedule Daily Workout Reminder ─────────────────────────────────────────
/**
 * Schedule a daily workout reminder at 8:00 AM
 * Cancels any existing daily reminder before scheduling
 * @param {string} userName - User's first name for personalized message
 * @returns {Promise<string>} Notification identifier
 */
export async function scheduleDailyWorkoutReminder(userName = 'Champ') {
  // Cancel existing daily reminders
  await cancelDailyWorkoutReminder();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '💪 Time to Train, ' + userName + '!',
      body: "Your workout is waiting. Open FitTrack AI and crush today's session!",
      sound: 'default',
      data: { type: 'daily_reminder', screen: 'LogWorkout' },
      categoryIdentifier: 'workout_reminder',
    },
    trigger: {
      hour: 8,
      minute: 0,
      repeats: true,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
  });

  await AsyncStorage.setItem('@fittrack_daily_notif_id', identifier);
  // Daily reminder scheduled
  return identifier;
}

// ─── Cancel Daily Workout Reminder ────────────────────────────────────────────
export async function cancelDailyWorkoutReminder() {
  try {
    const existingId = await AsyncStorage.getItem('@fittrack_daily_notif_id');
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem('@fittrack_daily_notif_id');
    }
  } catch (error) {
    // Silently fail on cancel
  }
}

// ─── Schedule Weekly Progress Notification ───────────────────────────────────
/**
 * Schedule a weekly progress summary notification every Sunday at 7:00 PM
 * @param {string} userName
 * @returns {Promise<string>} Notification identifier
 */
export async function scheduleWeeklyProgressNotification(userName = 'Athlete') {
  await cancelWeeklyProgressNotification();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Weekly Progress Report',
      body: `Great week, ${userName}! Open FitTrack AI to see your progress summary and plan next week.`,
      sound: 'default',
      data: { type: 'weekly_progress', screen: 'Progress' },
    },
    trigger: {
      weekday: 1, // Sunday (1 = Sunday in Expo's system)
      hour: 19,
      minute: 0,
      repeats: true,
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    },
  });

  await AsyncStorage.setItem('@fittrack_weekly_notif_id', identifier);
  // Weekly progress notification scheduled
  return identifier;
}

// ─── Cancel Weekly Progress Notification ──────────────────────────────────────
export async function cancelWeeklyProgressNotification() {
  try {
    const existingId = await AsyncStorage.getItem('@fittrack_weekly_notif_id');
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem('@fittrack_weekly_notif_id');
    }
  } catch (error) {
    // Silently fail on cancel
  }
}

// ─── Streak-Saver Evening Reminder ────────────────────────────────────────────
/**
 * 7:00 PM daily nudge aimed at protecting the user's streak. Fires every day;
 * users who already worked out that day will see it as a win-reinforcement.
 */
export async function scheduleStreakSaverReminder(userName = 'Champ') {
  await cancelStreakSaverReminder();
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔥 Don't break your streak, ${userName}!`,
      body: "Still have time today — log a quick session and keep the fire going.",
      sound: 'default',
      data: { type: 'streak_saver', screen: 'LogWorkout' },
    },
    trigger: {
      hour: 19,
      minute: 0,
      repeats: true,
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
    },
  });
  await AsyncStorage.setItem('@fittrack_streak_notif_id', identifier);
  return identifier;
}

export async function cancelStreakSaverReminder() {
  try {
    const existingId = await AsyncStorage.getItem('@fittrack_streak_notif_id');
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem('@fittrack_streak_notif_id');
    }
  } catch {
    // Silently fail on cancel
  }
}

// ─── Send Immediate Notification ──────────────────────────────────────────────
/**
 * Send an immediate local notification (e.g., after logging a workout)
 * @param {string} title
 * @param {string} body
 * @param {Object} data - Additional data payload
 */
export async function sendImmediateNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default', data },
    trigger: null, // null = fire immediately
  });
}

// ─── Send Streak Milestone Notification ───────────────────────────────────────
/**
 * Send a congratulatory notification on streak milestones
 * @param {number} streak - Current streak count
 * @param {string} userName
 */
export async function sendStreakMilestoneNotification(streak, userName = 'Champ') {
  const milestones = [3, 7, 14, 21, 30, 60, 90, 180, 365];
  if (!milestones.includes(streak)) return;

  const messages = {
    3: { emoji: '🔥', msg: '3-day streak! You are building a habit!' },
    7: { emoji: '⚡', msg: "1-week streak! You're on fire!" },
    14: { emoji: '💪', msg: '2 weeks strong! Incredible consistency!' },
    21: { emoji: '🏆', msg: "21 days — habit officially formed! You're unstoppable!" },
    30: { emoji: '🌟', msg: '30-day streak! One whole month of dedication!' },
    60: { emoji: '🎯', msg: '60 days! You are a fitness machine!' },
    90: { emoji: '👑', msg: '90-day streak! Elite level achieved!' },
    180: { emoji: '🦁', msg: '180 days! Half a year of unstoppable progress!' },
    365: { emoji: '🎖️', msg: '365-day streak! You are a fitness legend!' },
  };

  const { emoji, msg } = messages[streak] || { emoji: '🔥', msg: `${streak}-day streak!` };

  await sendImmediateNotification(
    `${emoji} ${streak}-Day Streak, ${userName}!`,
    msg
  );
}

// ─── Cancel All Notifications ─────────────────────────────────────────────────
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'false');
}

// ─── Setup All Notifications ──────────────────────────────────────────────────
/**
 * Full setup: request permission + schedule all recurring notifications
 * @param {string} userName
 * @returns {Promise<boolean>} Whether setup was successful
 */
export async function setupNotifications(userName) {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return false;

    await scheduleDailyWorkoutReminder(userName);
    await scheduleStreakSaverReminder(userName);
    await scheduleWeeklyProgressNotification(userName);

    // Remote push token is best-effort — local schedules above don't depend on it.
    registerForPushNotifications().catch(() => {});

    return true;
  } catch (error) {
    // Setup failed silently
    return false;
  }
}

// ─── Notification Response Handler ────────────────────────────────────────────
/**
 * Add a listener for notification interactions (taps)
 * Returns a cleanup function to remove the listener
 * @param {Function} navigate - Navigation function from React Navigation
 * @returns {Function} Cleanup function
 */
export function addNotificationResponseListener(navigate) {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      if (data?.screen) {
        navigate(data.screen);
      }
    }
  );

  return () => subscription.remove();
}
