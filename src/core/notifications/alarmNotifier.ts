import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AlarmItem } from '../../modules/interval-alarm/types';
import {
  calculateNextOccurrence,
  generateIntervalSequence,
  generateOffsetSequence,
  formatTime12h,
} from '../../modules/interval-alarm/engine/intervalEngine';

export const ALARM_CHANNEL_ID = 'alarming_interval_alarm_channel_v3';
export const INTERVAL_CATEGORY_ID = 'ALARMING_INTERVAL_CATEGORY';
export const SINGLE_CATEGORY_ID = 'ALARMING_SINGLE_CATEGORY';

export const ACTION_DISMISS_ALL = 'DISMISS_ALL_REMAINING';
export const ACTION_SNOOZE_NEXT = 'SNOOZE_NEXT';
export const ACTION_DISMISS_SINGLE = 'DISMISS_SINGLE';
export const ACTION_SNOOZE_SINGLE = 'SNOOZE_SINGLE';

// On iOS, 'defaultRingtone' invokes the system ringtone/alarm; on Android, channel routes to TYPE_ALARM
const ALARM_NOTIFICATION_SOUND = Platform.OS === 'ios' ? 'defaultRingtone' : 'default';

// Configure in-app notification presentation handler on native platforms
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Checks current notification permission status across platforms.
 */
export async function checkNotificationPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return {
        granted: Notification.permission === 'granted',
        canAskAgain: Notification.permission === 'default',
      };
    }
    return { granted: true, canAskAgain: false };
  }

  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain,
    };
  } catch {
    return { granted: false, canAskAgain: true };
  }
}

/**
 * Initialize high-importance Android alarm channels & interactive lockscreen actions
 */
export async function initializeAlarmNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {}
      }
    }
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowCriticalAlerts: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted.');
    }

    if (Platform.OS === 'android') {
      // Clean up legacy channel if present
      try {
        await Notifications.deleteNotificationChannelAsync('alarming_interval_alarm_channel_v2');
      } catch {}

      const existing = await Notifications.getNotificationChannelAsync(ALARM_CHANNEL_ID);
      if (!existing) {
        await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
          name: 'Alarming Wakeup',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500, 200, 500],
          enableLights: true,
          lightColor: '#AD343E',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.ALARM,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
            flags: {
              enforceAudibility: true,
              requestHardwareAudioVideoSynchronization: false,
            },
          },
        });
      }
    }

    // Set up interactive lock-screen action buttons
    await Notifications.setNotificationCategoryAsync(INTERVAL_CATEGORY_ID, [
      {
        identifier: ACTION_DISMISS_SINGLE,
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: ACTION_SNOOZE_NEXT,
        buttonTitle: 'Snooze',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(SINGLE_CATEGORY_ID, [
      {
        identifier: ACTION_DISMISS_SINGLE,
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: ACTION_SNOOZE_SINGLE,
        buttonTitle: 'Snooze',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  } catch (error) {
    console.warn('Failed to initialize notifications:', error);
  }
}

/**
 * Schedules all alarms for an enabled AlarmItem.
 * Returns the list of scheduled notification IDs.
 */
export async function scheduleAlarmsForAlarmItem(alarm: AlarmItem): Promise<string[]> {
  if (!alarm.isEnabled || Platform.OS === 'web') {
    return [];
  }

  // Cancel any previously scheduled notifications for this alarm
  if (alarm.notificationIds && alarm.notificationIds.length > 0) {
    for (const notifId of alarm.notificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifId);
      } catch {}
    }
  }

  const nextOccurrenceDate = calculateNextOccurrence(alarm);
  const scheduledIds: string[] = [];

  if (alarm.type === 'single') {
    // Single Alarm
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: alarm.label || 'Alarm',
          body: 'Time to rise gently',
          sound: ALARM_NOTIFICATION_SOUND,
          categoryIdentifier: SINGLE_CATEGORY_ID,
          data: {
            alarmId: alarm.id,
            type: 'single',
            timeString: formatTime12h(alarm.startHour, alarm.startMinute),
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: nextOccurrenceDate,
          channelId: ALARM_CHANNEL_ID,
        },
      });
      scheduledIds.push(id);
    } catch (e) {
      console.warn('Error scheduling single alarm:', e);
    }
  } else if (alarm.type === 'offset') {
    // Offset Alarm Sequence
    const steps = generateOffsetSequence(
      alarm.startHour,
      alarm.startMinute,
      alarm.offsetDirection || 'before',
      alarm.alarmCount || 10,
      alarm.intervalMinutes || 10
    );

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // Mathematically exact step date based on sequence elapsed minutes
      const stepDate = new Date(nextOccurrenceDate.getTime() + step.totalMinutesFromStart * 60 * 1000);

      // Only schedule future steps
      if (stepDate.getTime() > Date.now()) {
        try {
          const stepTitle = alarm.label
            ? `${alarm.label} • ${i + 1} of ${steps.length}`
            : `Alarm • ${i + 1} of ${steps.length}`;

          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: stepTitle,
              body: `${step.timeString} — Tap to wake or stop`,
              sound: ALARM_NOTIFICATION_SOUND,
              categoryIdentifier: INTERVAL_CATEGORY_ID,
              data: {
                alarmId: alarm.id,
                type: 'offset',
                stepIndex: i,
                totalSteps: steps.length,
                timeString: step.timeString,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: stepDate,
              channelId: ALARM_CHANNEL_ID,
            },
          });
          scheduledIds.push(id);
        } catch (e) {
          console.warn(`Error scheduling offset step ${i}:`, e);
        }
      }
    }
  } else {
    // Window Interval Alarm Sequence
    const steps = generateIntervalSequence(
      alarm.startHour,
      alarm.startMinute,
      alarm.endHour ?? alarm.startHour,
      alarm.endMinute ?? alarm.startMinute,
      alarm.intervalMinutes ?? 10
    );

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      // Mathematically exact step date based on sequence elapsed minutes
      const stepDate = new Date(nextOccurrenceDate.getTime() + step.totalMinutesFromStart * 60 * 1000);

      // Only schedule if in future
      if (stepDate.getTime() > Date.now()) {
        try {
          const stepTitle = alarm.label
            ? `${alarm.label} • ${i + 1} of ${steps.length}`
            : `Alarm • ${i + 1} of ${steps.length}`;

          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: stepTitle,
              body: `${step.timeString} — Tap to wake or stop`,
              sound: ALARM_NOTIFICATION_SOUND,
              categoryIdentifier: INTERVAL_CATEGORY_ID,
              data: {
                alarmId: alarm.id,
                type: 'interval',
                stepIndex: i,
                totalSteps: steps.length,
                timeString: step.timeString,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: stepDate,
              channelId: ALARM_CHANNEL_ID,
            },
          });
          scheduledIds.push(id);
        } catch (e) {
          console.warn(`Error scheduling interval step ${i}:`, e);
        }
      }
    }
  }

  return scheduledIds;
}

/**
 * Schedules a follow-up notification when an alarm is snoozed.
 */
export async function scheduleSnoozeNotification(
  alarm: AlarmItem,
  minutes: number = 10
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const triggerDate = new Date(Date.now() + minutes * 60 * 1000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${alarm.label || 'Alarm'} (Snoozed)`,
        body: 'Time to wake up gently',
        sound: ALARM_NOTIFICATION_SOUND,
        categoryIdentifier: SINGLE_CATEGORY_ID,
        data: {
          alarmId: alarm.id,
          type: alarm.type,
          isSnooze: true,
          timeString: formatTime12h(triggerDate.getHours(), triggerDate.getMinutes()),
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: ALARM_CHANNEL_ID,
      },
    });
    return id;
  } catch (e) {
    console.warn('Error scheduling snooze notification:', e);
    return null;
  }
}

/**
 * Dismisses any currently visible/delivered notifications in the tray for a specific alarm.
 */
export async function dismissPresentedNotificationsForAlarm(alarmId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const notif of presented) {
      const data = notif.request?.content?.data;
      if (data?.alarmId === alarmId) {
        await Notifications.dismissNotificationAsync(notif.request.identifier);
      }
    }
  } catch (e) {
    console.warn('Error dismissing presented notifications:', e);
  }
}

/**
 * Cancels all remaining scheduled notifications and dismisses any presented notifications for an alarm.
 */
export async function cancelAllScheduledNotificationsForAlarm(alarm: AlarmItem): Promise<void> {
  if (Platform.OS === 'web') return;

  if (alarm.notificationIds && alarm.notificationIds.length > 0) {
    for (const notifId of alarm.notificationIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifId);
      } catch {}
      try {
        await Notifications.dismissNotificationAsync(notifId);
      } catch {}
    }
  }

  await dismissPresentedNotificationsForAlarm(alarm.id);
}
