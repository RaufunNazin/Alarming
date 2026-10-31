import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AlarmItem } from '../../modules/interval-alarm/types';
import {
  getUpcomingAlarmStepDates,
  formatTime12h,
} from '../../modules/interval-alarm/engine/intervalEngine';
import { alarmSoundPlayer } from '../audio/alarmSoundPlayer';
import { useSettingsStore } from '../settings/settingsStore';
import { formatNumberLocalized } from '../i18n/translations';

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
const SCHEDULE_BATCH_CHUNK_SIZE = 4;

// Per-alarm operation token to abort stale in-flight scheduling if an alarm is edited, toggled, or deleted
const latestScheduleTokenByAlarmId: Record<string, number> = {};

function nextAlarmScheduleToken(alarmId: string): number {
  const next = (latestScheduleTokenByAlarmId[alarmId] || 0) + 1;
  latestScheduleTokenByAlarmId[alarmId] = next;
  return next;
}

// Global sequential task queue so bulk operations (e.g. category toggle or app startup sync)
// never flood Android's BroadcastReceiver.goAsync() threads or Binder IPC buffer concurrently
let notificationTaskQueue: Promise<void> = Promise.resolve();

function enqueueNotificationTask<T>(task: () => Promise<T>): Promise<T> {
  const resultPromise = notificationTaskQueue.then(task, task);
  notificationTaskQueue = resultPromise.then(
    () => undefined,
    () => undefined
  );
  return resultPromise;
}

function buildStepNotificationId(alarmId: string, slotIndex: number): string {
  return `${alarmId}_slot_${slotIndex}`;
}

function buildSnoozeNotificationId(alarmId: string): string {
  return `${alarmId}_snooze`;
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
 * (both known `notificationIds` and deterministic slot identifiers)
 * without calling `getAllScheduledNotificationsAsync()`, avoiding large Binder IPC
 * Parcelable transactions on Android during bulk category toggles.
 */
async function cancelScheduledIdsForAlarmInternal(
  alarmId: string,
  knownNotificationIds?: string[]
): Promise<void> {
  if (Platform.OS === 'web') return;

  const idsToCancel = new Set<string>(knownNotificationIds || []);
  idsToCancel.add(buildSnoozeNotificationId(alarmId));

  if (alarmId === 'power_nap') {
    idsToCancel.add(buildStepNotificationId('power_nap', 0));
  } else {
    for (let slot = 0; slot < MAX_SCHEDULED_STEPS_PER_ALARM; slot++) {
      idsToCancel.add(buildStepNotificationId(alarmId, slot));
    }
  }

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
 * for an enabled AlarmItem via the serialized notification task queue.
 * Returns the list of scheduled notification IDs.
 */
export async function scheduleAlarmsForAlarmItem(alarm: AlarmItem): Promise<string[]> {
  if (Platform.OS === 'web') {
    return [];
  }

  const token = nextAlarmScheduleToken(alarm.id);

  return enqueueNotificationTask(async () => {
    if (latestScheduleTokenByAlarmId[alarm.id] !== token) {
      return [];
    }

    // Cancel any previously scheduled notifications for this alarm
    await cancelScheduledIdsForAlarmInternal(alarm.id, alarm.notificationIds);

    if (alarm.pausedUntil && alarm.pausedUntil > Date.now()) {
      await dismissPresentedNotificationsForAlarm(alarm.id);
    }

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
        chunk.map(async (step, chunkIdx) => {
          const slotIndex = offset + chunkIdx;
          if (step.date.getTime() <= Date.now()) {
            return null;
          }

          try {
            const lang = useSettingsStore.getState().language;
            const defaultAlarmLabel = lang === 'bn' ? 'অ্যালার্ম' : 'Alarm';
            const singleBody =
              lang === 'bn'
                ? `${formatNumberLocalized(step.timeString, 'bn')} — ঘুম থেকে ওঠার সময় হয়েছে`
                : `${step.timeString} — Time to rise gently`;
            const notifIdentifier = buildStepNotificationId(alarm.id, slotIndex);

            if (alarm.type === 'single') {
              return await Notifications.scheduleNotificationAsync({
                identifier: notifIdentifier,
                content: {
                  title: alarm.label || defaultAlarmLabel,
                  body: singleBody,
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

            const stepTitle =
              lang === 'bn'
                ? `${alarm.label || defaultAlarmLabel} • ${formatNumberLocalized(
                    step.stepIndex + 1,
                    'bn'
                  )}/${formatNumberLocalized(step.totalSteps, 'bn')}`
                : `${alarm.label || defaultAlarmLabel} • ${step.stepIndex + 1} of ${
                    step.totalSteps
                  }`;
            const stepBody =
              lang === 'bn'
                ? `${formatNumberLocalized(step.timeString, 'bn')} — বন্ধ করতে ট্যাপ করুন`
                : `${step.timeString} — Tap to wake or stop`;

            return await Notifications.scheduleNotificationAsync({
              identifier: notifIdentifier,
              content: {
                title: stepTitle,
                body: stepBody,
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
  });
}

/**
 * Schedules a follow-up notification when an alarm is snoozed.
 */
export async function scheduleSnoozeNotification(
  alarm: AlarmItem,
  minutes: number = 10,
  stepIndex: number = 0,
  totalSteps: number = 1
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  return enqueueNotificationTask(async () => {
    try {
      const lang = useSettingsStore.getState().language;
      const defaultLabel = lang === 'bn' ? 'অ্যালার্ম' : 'Alarm';
      const snoozedSuffix = lang === 'bn' ? '(স্নুজ)' : '(Snoozed)';
      const snoozeBody =
        lang === 'bn' ? 'আবার ঘুম থেকে ওঠার সময় হয়েছে' : 'Time to wake up gently';

      const triggerDate = new Date(Date.now() + minutes * 60 * 1000);
      const categoryId = alarm.type === 'single' ? SINGLE_CATEGORY_ID : INTERVAL_CATEGORY_ID;
      const snoozeId = buildSnoozeNotificationId(alarm.id);
      await Notifications.cancelScheduledNotificationAsync(snoozeId).catch(() => {});

      const id = await Notifications.scheduleNotificationAsync({
        identifier: snoozeId,
        content: {
          title: `${alarm.label || defaultLabel} ${snoozedSuffix}`,
          body: snoozeBody,
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
            stepIndex,
            totalSteps,
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
  });
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

  await enqueueNotificationTask(async () => {
    await Promise.all([
      cancelScheduledIdsForAlarmInternal(alarm.id, alarm.notificationIds),
      dismissPresentedNotificationsForAlarm(alarm.id),
    ]);
  });
}

/**
 * Schedules a standalone OS notification for an active Power Nap.
 */
export async function schedulePowerNapNotification(
  endsAt: number,
  label: string = 'Power Nap'
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  await cancelPowerNapNotification();

  return enqueueNotificationTask(async () => {
    try {
      const triggerDate = new Date(endsAt);
      if (triggerDate.getTime() <= Date.now()) return null;

      const lang = useSettingsStore.getState().language;
      const napBody =
        lang === 'bn'
          ? 'পাওয়ার ন্যাপ শেষ হয়েছে — ওঠার সময় হয়েছে!'
          : 'Power nap finished — time to wake up!';

      const id = await Notifications.scheduleNotificationAsync({
        identifier: buildStepNotificationId('power_nap', 0),
        content: {
          title: label,
          body: napBody,
          sound: ALARM_NOTIFICATION_SOUND,
          categoryIdentifier: SINGLE_CATEGORY_ID,
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
          autoDismiss: false,
          interruptionLevel: 'critical',
          data: {
            alarmId: 'power_nap',
            type: 'single',
            stepIndex: 0,
            totalSteps: 1,
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
      console.warn('Error scheduling power nap notification:', e);
      return null;
    }
  });
}

/**
 * Cancels any scheduled or presented Power Nap notifications.
 */
export async function cancelPowerNapNotification(notificationId?: string): Promise<void> {
  if (Platform.OS === 'web') return;

  await enqueueNotificationTask(async () => {
    await Promise.all([
      cancelScheduledIdsForAlarmInternal(
        'power_nap',
        notificationId ? [notificationId] : undefined
      ),
      dismissPresentedNotificationsForAlarm('power_nap'),
    ]);
  });
}

/**
 * Performs a single startup sweep to cancel any orphaned or legacy random-UUID notifications
 * that do not belong to currently enabled alarms.
 */
export async function pruneOrphanedScheduledNotifications(
  alarms: AlarmItem[],
  hasActivePowerNap: boolean = false
): Promise<void> {
  if (Platform.OS === 'web') return;

  await enqueueNotificationTask(async () => {
    try {
      const enabledAlarmMap = new Map<string, Set<string>>();
      for (const alarm of alarms) {
        if (!alarm.isEnabled) continue;
        const allowedIds = new Set<string>(alarm.notificationIds || []);
        for (let slot = 0; slot < MAX_SCHEDULED_STEPS_PER_ALARM; slot++) {
          allowedIds.add(buildStepNotificationId(alarm.id, slot));
        }
        if (alarm.snoozedUntil && alarm.snoozedUntil > Date.now()) {
          allowedIds.add(buildSnoozeNotificationId(alarm.id));
        }
        enabledAlarmMap.set(alarm.id, allowedIds);
      }

      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      const orphanIds: string[] = [];

      for (const req of allScheduled) {
        const id = req.identifier;
        const alarmId = req.content?.data?.alarmId as string | undefined;
        if (!alarmId) continue;

        if (alarmId === 'power_nap') {
          if (!hasActivePowerNap) {
            orphanIds.push(id);
          }
          continue;
        }

        const allowedForAlarm = enabledAlarmMap.get(alarmId);
        if (!allowedForAlarm || (allowedForAlarm.size > 0 && !allowedForAlarm.has(id))) {
          orphanIds.push(id);
        }
      }

      for (let i = 0; i < orphanIds.length; i += SCHEDULE_BATCH_CHUNK_SIZE) {
        const chunk = orphanIds.slice(i, i + SCHEDULE_BATCH_CHUNK_SIZE);
        await Promise.all(
          chunk.map((notifId) =>
            Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {})
          )
        );
      }
    } catch {
      // Ignore if platform does not support querying all scheduled notifications
    }
  });
}
