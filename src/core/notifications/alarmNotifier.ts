import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AlarmItem } from '../../modules/interval-alarm/types';
import {
  getUpcomingAlarmStepDates,
  formatTime12h,
} from '../../modules/interval-alarm/engine/intervalEngine';
import { alarmSoundPlayer } from '../audio/alarmSoundPlayer';

export const ALARM_CHANNEL_ID = 'alarming_interval_alarm_channel_v3';
export const INTERVAL_CATEGORY_ID = 'ALARMING_INTERVAL_CATEGORY';
export const SINGLE_CATEGORY_ID = 'ALARMING_SINGLE_CATEGORY';

export const ACTION_DISMISS_ALL = 'DISMISS_ALL_REMAINING';
export const ACTION_SNOOZE_NEXT = 'SNOOZE_NEXT';
export const ACTION_DISMISS_SINGLE = 'DISMISS_SINGLE';
export const ACTION_SNOOZE_SINGLE = 'SNOOZE_SINGLE';

/**
 * Rolling window cap per alarm so large windows never saturate OS AlarmManager / UNUserNotificationCenter
 * (iOS enforces a 64-notification system limit across the whole app).
 * Automatically replenished as steps ring or when the app wakes/ticks.
 */
export const MAX_SCHEDULED_STEPS_PER_ALARM = 24;
const SCHEDULE_BATCH_CHUNK_SIZE = 8;

// Per-alarm operation token to abort stale in-flight scheduling if an alarm is edited, toggled, or deleted
const latestScheduleTokenByAlarmId: Record<string, number> = {};

function nextAlarmScheduleToken(alarmId: string): number {
  const next = (latestScheduleTokenByAlarmId[alarmId] || 0) + 1;
  latestScheduleTokenByAlarmId[alarmId] = next;
  return next;
}

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

      // Ensure Android 14+ (API 34+) full-screen lockscreen intent permission is enabled
      const canUseFullScreen = await alarmSoundPlayer.canUseFullScreenIntent();
      if (!canUseFullScreen) {
        alarmSoundPlayer.openFullScreenIntentSettings();
      }
    }

    // Set up interactive lock-screen action buttons
    await Notifications.setNotificationCategoryAsync(INTERVAL_CATEGORY_ID, [
      {
        identifier: ACTION_DISMISS_SINGLE,
        buttonTitle: 'Stop',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: ACTION_SNOOZE_NEXT,
        buttonTitle: 'Snooze',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: ACTION_DISMISS_ALL,
        buttonTitle: 'Stop All Today',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync(SINGLE_CATEGORY_ID, [
      {
        identifier: ACTION_DISMISS_SINGLE,
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: ACTION_SNOOZE_SINGLE,
        buttonTitle: 'Snooze',
        options: {
          opensAppToForeground: false,
          isAuthenticationRequired: false,
        },
      },
    ]);
  } catch (error) {
    console.warn('Failed to initialize notifications:', error);
  }
}

/**
 * Helper to cancel all scheduled OS notifications belonging to a specific alarmId
 * (both known `notificationIds` and any matching scheduled notifications in the OS queue)
 * concurrently via `Promise.all`.
 */
async function cancelScheduledIdsForAlarmInternal(
  alarmId: string,
  knownNotificationIds?: string[]
): Promise<void> {
  if (Platform.OS === 'web') return;

  const idsToCancel = new Set<string>(knownNotificationIds || []);

  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const req of allScheduled) {
      if (req.content?.data?.alarmId === alarmId) {
        idsToCancel.add(req.identifier);
      }
    }
  } catch {}

  if (idsToCancel.size === 0) return;

  const idList = Array.from(idsToCancel);
  for (let i = 0; i < idList.length; i += SCHEDULE_BATCH_CHUNK_SIZE) {
    const chunk = idList.slice(i, i + SCHEDULE_BATCH_CHUNK_SIZE);
    await Promise.all(
      chunk.map((notifId) =>
        Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {})
      )
    );
  }
}

/**
 * Schedules a rolling window of up to MAX_SCHEDULED_STEPS_PER_ALARM upcoming steps
 * for an enabled AlarmItem in fast parallel chunks.
 * Returns the list of scheduled notification IDs.
 */
export async function scheduleAlarmsForAlarmItem(alarm: AlarmItem): Promise<string[]> {
  if (Platform.OS === 'web') {
    return [];
  }

  const token = nextAlarmScheduleToken(alarm.id);

  // Cancel any previously scheduled notifications for this alarm concurrently
  await cancelScheduledIdsForAlarmInternal(alarm.id, alarm.notificationIds);

  if (!alarm.isEnabled || latestScheduleTokenByAlarmId[alarm.id] !== token) {
    return [];
  }

  const upcomingSteps = getUpcomingAlarmStepDates(alarm);
  const stepsToSchedule = upcomingSteps.slice(0, MAX_SCHEDULED_STEPS_PER_ALARM);
  const scheduledIds: string[] = [];

  for (let offset = 0; offset < stepsToSchedule.length; offset += SCHEDULE_BATCH_CHUNK_SIZE) {
    if (latestScheduleTokenByAlarmId[alarm.id] !== token) {
      // A newer schedule/cancel operation started for this alarm; clean up partial work
      await Promise.all(
        scheduledIds.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
        )
      );
      return [];
    }

    const chunk = stepsToSchedule.slice(offset, offset + SCHEDULE_BATCH_CHUNK_SIZE);
    const chunkResults = await Promise.all(
      chunk.map(async (step) => {
        if ( step.date.getTime() <= Date.now() ) {
          return null;
        }

        try {
          if (alarm.type === 'single') {
            return await Notifications.scheduleNotificationAsync({
              content: {
                title: alarm.label || 'Alarm',
                body: 'Time to rise gently',
                sound: ALARM_NOTIFICATION_SOUND,
                categoryIdentifier: SINGLE_CATEGORY_ID,
                priority: Notifications.AndroidNotificationPriority.MAX,
                sticky: true,
                autoDismiss: false,
                interruptionLevel: 'critical',
                data: {
                  alarmId: alarm.id,
                  type: 'single',
                  stepIndex: 0,
                  totalSteps: 1,
                  timeString: step.timeString,
                  cycleDateStr: step.cycleDateStr,
                },
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: step.date,
                channelId: ALARM_CHANNEL_ID,
                delivery: 'alarmClock',
              },
            });
          }

          const stepTitle = alarm.label
            ? `${alarm.label} • ${step.stepIndex + 1} of ${step.totalSteps}`
            : `Alarm • ${step.stepIndex + 1} of ${step.totalSteps}`;

          return await Notifications.scheduleNotificationAsync({
            content: {
              title: stepTitle,
              body: `${step.timeString} — Tap to wake or stop`,
              sound: ALARM_NOTIFICATION_SOUND,
              categoryIdentifier: INTERVAL_CATEGORY_ID,
              priority: Notifications.AndroidNotificationPriority.MAX,
              sticky: true,
              autoDismiss: false,
              interruptionLevel: 'critical',
              data: {
                alarmId: alarm.id,
                type: alarm.type,
                stepIndex: step.stepIndex,
                totalSteps: step.totalSteps,
                timeString: step.timeString,
                cycleDateStr: step.cycleDateStr,
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: step.date,
              channelId: ALARM_CHANNEL_ID,
              delivery: 'alarmClock',
            },
          });
        } catch (e) {
          console.warn(`Error scheduling alarm step ${step.stepIndex}:`, e);
          return null;
        }
      })
    );

    for (const id of chunkResults) {
      if (id) {
        scheduledIds.push(id);
      }
    }
  }

  // Final check in case alarm was deleted/disabled while the last chunk was awaiting
  if (latestScheduleTokenByAlarmId[alarm.id] !== token) {
    await Promise.all(
      scheduledIds.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
      )
    );
    return [];
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
    const categoryId = alarm.type === 'single' ? SINGLE_CATEGORY_ID : INTERVAL_CATEGORY_ID;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${alarm.label || 'Alarm'} (Snoozed)`,
        body: 'Time to wake up gently',
        sound: ALARM_NOTIFICATION_SOUND,
        categoryIdentifier: categoryId,
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: true,
        autoDismiss: false,
        interruptionLevel: 'critical',
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
        delivery: 'alarmClock',
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
    const matchingIds = presented
      .filter((notif) => notif.request?.content?.data?.alarmId === alarmId)
      .map((notif) => notif.request.identifier);

    if (matchingIds.length > 0) {
      await Promise.all(
        matchingIds.map((id) => Notifications.dismissNotificationAsync(id).catch(() => {}))
      );
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

  // Invalidate any in-flight scheduleAlarmsForAlarmItem call for this alarm immediately
  nextAlarmScheduleToken(alarm.id);

  await Promise.all([
    cancelScheduledIdsForAlarmInternal(alarm.id, alarm.notificationIds),
    dismissPresentedNotificationsForAlarm(alarm.id),
  ]);
}
