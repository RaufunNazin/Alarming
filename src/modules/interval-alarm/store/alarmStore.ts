import { create } from 'zustand';
import { AlarmItem, ActiveRingingAlarm, AlarmType } from '../types';
import { AlarmStorage } from '../../../core/storage/alarmStorage';
import {
  scheduleAlarmsForAlarmItem,
  scheduleSnoozeNotification,
  cancelAllScheduledNotificationsForAlarm,
  checkNotificationPermissions,
} from '../../../core/notifications/alarmNotifier';
import {
  getAlarmToastMessage,
  formatTime12h,
  calculateNextOccurrence,
} from '../engine/intervalEngine';

interface AlarmState {
  alarms: AlarmItem[];
  activeRinging: ActiveRingingAlarm | null;
  loveNoteGreeting: string;
  lastSelectedType: AlarmType;
  isInitialized: boolean;
  toastMessage: string | null;

  // Actions
  initialize: () => Promise<void>;
  addAlarm: (alarmData: Omit<AlarmItem, 'id'>) => Promise<string>;
  updateAlarm: (id: string, updates: Partial<AlarmItem>) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string) => Promise<void>;
  dismissAllRemainingForToday: (alarmId: string) => Promise<void>;
  dismissSingleAlarm: (alarmId: string) => Promise<void>;
  snoozeAlarm: (alarmId: string, minutes?: number) => Promise<void>;
  setLoveNoteGreeting: (note: string) => Promise<void>;
  setLastSelectedType: (type: AlarmType) => Promise<void>;
  setActiveRinging: (ringing: ActiveRingingAlarm | null) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  checkAlarmTriggerTick: () => void;
}

// In-memory set to prevent double-firing in the same minute during active ticking
const triggeredMinutesSet = new Set<string>();

export const useAlarmStore = create<AlarmState>((set, get) => ({
  alarms: [],
  activeRinging: null,
  loveNoteGreeting: 'Good morning, my love',
  lastSelectedType: 'single',
  isInitialized: false,
  toastMessage: null,

  showToast: (message: string) => set({ toastMessage: message }),
  hideToast: () => set({ toastMessage: null }),

  initialize: async () => {
    if (get().isInitialized) return;
    const alarms = await AlarmStorage.getAlarms();
    const loveNoteGreeting = await AlarmStorage.getLoveNoteGreeting();
    const lastSelectedType = await AlarmStorage.getLastSelectedAlarmType();
    set({ alarms, loveNoteGreeting, lastSelectedType, isInitialized: true });

    // Schedule active alarms on boot
    for (const alarm of alarms) {
      if (alarm.isEnabled) {
        const notifIds = await scheduleAlarmsForAlarmItem(alarm);
        alarm.notificationIds = notifIds;
      }
    }
    await AlarmStorage.saveAlarms(alarms);
  },

  addAlarm: async (alarmData) => {
    const id = `alarm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newAlarm: AlarmItem = {
      ...alarmData,
      id,
    };

    let toastMsg: string | null = null;
    if (newAlarm.isEnabled) {
      const notifIds = await scheduleAlarmsForAlarmItem(newAlarm);
      newAlarm.notificationIds = notifIds;
      toastMsg = getAlarmToastMessage(newAlarm);

      // Check permissions and notify user if notifications are disabled in settings
      const perm = await checkNotificationPermissions();
      if (!perm.granted && !perm.canAskAgain) {
        toastMsg = 'Note: Notifications disabled. Enable in settings to hear alarms.';
      }
    }

    const updatedAlarms = [...get().alarms, newAlarm];
    set({
      alarms: updatedAlarms,
      lastSelectedType: alarmData.type,
      ...(toastMsg ? { toastMessage: toastMsg } : {}),
    });
    await AlarmStorage.saveAlarms(updatedAlarms);
    await AlarmStorage.saveLastSelectedAlarmType(alarmData.type);
    return id;
  },

  setLastSelectedType: async (type) => {
    set({ lastSelectedType: type });
    await AlarmStorage.saveLastSelectedAlarmType(type);
  },

  updateAlarm: async (id, updates) => {
    const currentAlarms = get().alarms;
    const index = currentAlarms.findIndex((a) => a.id === id);
    if (index === -1) return;

    let updatedAlarm: AlarmItem = {
      ...currentAlarms[index],
      ...updates,
      // If time or repeat changes, reset dismissed status
      dismissedForToday: false,
      snoozedUntil: undefined,
    };

    let toastMsg: string | null = null;
    if (updatedAlarm.isEnabled) {
      const notifIds = await scheduleAlarmsForAlarmItem(updatedAlarm);
      updatedAlarm.notificationIds = notifIds;
      toastMsg = getAlarmToastMessage(updatedAlarm);
    } else {
      await cancelAllScheduledNotificationsForAlarm(updatedAlarm);
      updatedAlarm.notificationIds = [];
    }

    const updatedAlarms = [...currentAlarms];
    updatedAlarms[index] = updatedAlarm;

    set({
      alarms: updatedAlarms,
      ...(toastMsg ? { toastMessage: toastMsg } : {}),
    });
    await AlarmStorage.saveAlarms(updatedAlarms);
  },

  deleteAlarm: async (id) => {
    const currentAlarms = get().alarms;
    const target = currentAlarms.find((a) => a.id === id);
    if (target) {
      await cancelAllScheduledNotificationsForAlarm(target);
    }
    const updatedAlarms = currentAlarms.filter((a) => a.id !== id);
    set({ alarms: updatedAlarms });
    await AlarmStorage.saveAlarms(updatedAlarms);
  },

  toggleAlarm: async (id) => {
    const currentAlarms = get().alarms;
    const index = currentAlarms.findIndex((a) => a.id === id);
    if (index === -1) return;

    const alarm = currentAlarms[index];
    const willEnable = !alarm.isEnabled;

    let updatedAlarm: AlarmItem = {
      ...alarm,
      isEnabled: willEnable,
      dismissedForToday: false,
      snoozedUntil: undefined,
    };

    let toastMsg: string | null = null;
    if (willEnable) {
      const notifIds = await scheduleAlarmsForAlarmItem(updatedAlarm);
      updatedAlarm.notificationIds = notifIds;
      toastMsg = getAlarmToastMessage(updatedAlarm);

      const perm = await checkNotificationPermissions();
      if (!perm.granted && !perm.canAskAgain) {
        toastMsg = 'Note: Notifications disabled. Enable in settings to hear alarms.';
      }
    } else {
      await cancelAllScheduledNotificationsForAlarm(updatedAlarm);
      updatedAlarm.notificationIds = [];
    }

    const updatedAlarms = [...currentAlarms];
    updatedAlarms[index] = updatedAlarm;

    set({
      alarms: updatedAlarms,
      ...(toastMsg ? { toastMessage: toastMsg } : {}),
    });
    await AlarmStorage.saveAlarms(updatedAlarms);
  },

  dismissAllRemainingForToday: async (alarmId) => {
    const currentAlarms = get().alarms;
    const index = currentAlarms.findIndex((a) => a.id === alarmId);
    if (index === -1) {
      set({ activeRinging: null });
      return;
    }

    const alarm = currentAlarms[index];
    await cancelAllScheduledNotificationsForAlarm(alarm);

    const todayStr = new Date().toISOString().slice(0, 10);
    let updatedAlarm: AlarmItem = {
      ...alarm,
      dismissedForToday: true,
      lastDismissedDate: todayStr,
      notificationIds: [],
      snoozedUntil: undefined,
    };

    if (alarm.isOneOff || !alarm.repeatDays || alarm.repeatDays.length === 0) {
      updatedAlarm.isEnabled = false;
    } else {
      const nextNotifIds = await scheduleAlarmsForAlarmItem(updatedAlarm);
      updatedAlarm.notificationIds = nextNotifIds;
    }

    const updatedAlarms = [...currentAlarms];
    updatedAlarms[index] = updatedAlarm;

    set({ alarms: updatedAlarms, activeRinging: null });
    await AlarmStorage.saveAlarms(updatedAlarms);
  },

  dismissSingleAlarm: async (alarmId) => {
    const currentAlarms = get().alarms;
    const index = currentAlarms.findIndex((a) => a.id === alarmId);
    if (index === -1) {
      set({ activeRinging: null });
      return;
    }

    const alarm = currentAlarms[index];
    await cancelAllScheduledNotificationsForAlarm(alarm);

    let updatedAlarm: AlarmItem = {
      ...alarm,
      notificationIds: [],
      snoozedUntil: undefined,
    };

    if (alarm.isOneOff || !alarm.repeatDays || alarm.repeatDays.length === 0) {
      updatedAlarm.isEnabled = false;
    } else {
      const nextNotifIds = await scheduleAlarmsForAlarmItem(updatedAlarm);
      updatedAlarm.notificationIds = nextNotifIds;
    }

    const updatedAlarms = [...currentAlarms];
    updatedAlarms[index] = updatedAlarm;

    set({ alarms: updatedAlarms, activeRinging: null });
    await AlarmStorage.saveAlarms(updatedAlarms);
  },

  snoozeAlarm: async (alarmId, minutes = 10) => {
    // Dismiss current overlay immediately
    set({ activeRinging: null });

    const currentAlarms = get().alarms;
    const index = currentAlarms.findIndex((a) => a.id === alarmId);
    if (index === -1) return;

    const alarm = currentAlarms[index];
    const snoozedUntil = Date.now() + minutes * 60 * 1000;

    // Schedule high-priority notification for the snooze wake-up
    const snoozeNotifId = await scheduleSnoozeNotification(alarm, minutes);

    const updatedIds = [...(alarm.notificationIds || [])];
    if (snoozeNotifId) {
      updatedIds.push(snoozeNotifId);
    }

    const updatedAlarm: AlarmItem = {
      ...alarm,
      snoozedUntil,
      notificationIds: updatedIds,
    };

    const updatedAlarms = [...currentAlarms];
    updatedAlarms[index] = updatedAlarm;

    set({
      alarms: updatedAlarms,
      toastMessage: `Alarm snoozed for ${minutes} minutes`,
    });
    await AlarmStorage.saveAlarms(updatedAlarms);
  },

  setLoveNoteGreeting: async (note) => {
    set({ loveNoteGreeting: note });
    await AlarmStorage.saveLoveNoteGreeting(note);
  },

  setActiveRinging: (ringing) => {
    set({ activeRinging: ringing });
  },

  checkAlarmTriggerTick: () => {
    if (get().activeRinging) return; // Already ringing

    const now = new Date();
    const nowMs = now.getTime();
    const currentAlarms = get().alarms;

    for (const alarm of currentAlarms) {
      if (!alarm.isEnabled) continue;

      // Check active snooze
      if (alarm.snoozedUntil && nowMs >= alarm.snoozedUntil) {
        const timeStr = formatTime12h(now.getHours(), now.getMinutes());
        get().setActiveRinging({
          alarm,
          currentTimeString: timeStr,
          currentStepIndex: 0,
          totalSteps: 1,
        });

        // Clear snooze
        get().updateAlarm(alarm.id, { snoozedUntil: undefined });
        return;
      }

      // Check scheduled occurrence
      if (!alarm.dismissedForToday) {
        const nextOccurrence = calculateNextOccurrence(alarm, now);
        const diffMs = nextOccurrence.getTime() - nowMs;

        // If next occurrence is due now (within 30-second window)
        if (Math.abs(diffMs) <= 30000) {
          const minuteKey = `${alarm.id}_${now.toISOString().slice(0, 16)}`;
          if (!triggeredMinutesSet.has(minuteKey)) {
            triggeredMinutesSet.add(minuteKey);
            const timeStr = formatTime12h(alarm.startHour, alarm.startMinute);
            get().setActiveRinging({
              alarm,
              currentTimeString: timeStr,
              currentStepIndex: 0,
              totalSteps: 1,
            });
            return;
          }
        }
      }
    }
  },
}));
