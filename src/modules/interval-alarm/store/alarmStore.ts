import { create } from 'zustand';
import { AlarmItem, ActiveRingingAlarm } from '../types';
import { AlarmStorage } from '../../../core/storage/alarmStorage';
import {
  scheduleAlarmsForAlarmItem,
  cancelAllScheduledNotificationsForAlarm,
} from '../../../core/notifications/alarmNotifier';

interface AlarmState {
  alarms: AlarmItem[];
  activeRinging: ActiveRingingAlarm | null;
  loveNoteGreeting: string;
  isInitialized: boolean;

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
  setActiveRinging: (ringing: ActiveRingingAlarm | null) => void;
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  alarms: [],
  activeRinging: null,
  loveNoteGreeting: 'Good morning, my love',
  isInitialized: false,

  initialize: async () => {
    const alarms = await AlarmStorage.getAlarms();
    const loveNoteGreeting = await AlarmStorage.getLoveNoteGreeting();
    set({ alarms, loveNoteGreeting, isInitialized: true });

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

    if (newAlarm.isEnabled) {
      const notifIds = await scheduleAlarmsForAlarmItem(newAlarm);
      newAlarm.notificationIds = notifIds;
    }

    const updatedAlarms = [...get().alarms, newAlarm];
    set({ alarms: updatedAlarms });
    await AlarmStorage.saveAlarms(updatedAlarms);
    return id;
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
    };

    if (updatedAlarm.isEnabled) {
      const notifIds = await scheduleAlarmsForAlarmItem(updatedAlarm);
      updatedAlarm.notificationIds = notifIds;
    } else {
      await cancelAllScheduledNotificationsForAlarm(updatedAlarm);
      updatedAlarm.notificationIds = [];
    }

    const updatedAlarms = [...currentAlarms];
    updatedAlarms[index] = updatedAlarm;

    set({ alarms: updatedAlarms });
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
    };

    if (willEnable) {
      const notifIds = await scheduleAlarmsForAlarmItem(updatedAlarm);
      updatedAlarm.notificationIds = notifIds;
    } else {
      await cancelAllScheduledNotificationsForAlarm(updatedAlarm);
      updatedAlarm.notificationIds = [];
    }

    const updatedAlarms = [...currentAlarms];
    updatedAlarms[index] = updatedAlarm;

    set({ alarms: updatedAlarms });
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
    // Cancel all upcoming scheduled notifications for today
    await cancelAllScheduledNotificationsForAlarm(alarm);

    const todayStr = new Date().toISOString().slice(0, 10);
    let updatedAlarm: AlarmItem = {
      ...alarm,
      dismissedForToday: true,
      lastDismissedDate: todayStr,
      notificationIds: [],
    };

    // If it's a one-off alarm, disable it completely
    if (alarm.isOneOff || !alarm.repeatDays || alarm.repeatDays.length === 0) {
      updatedAlarm.isEnabled = false;
    } else {
      // Re-schedule for the next active repeat day automatically!
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
    };

    // If one-off, automatically switch off
    if (alarm.isOneOff || !alarm.repeatDays || alarm.repeatDays.length === 0) {
      updatedAlarm.isEnabled = false;
    } else {
      // Re-schedule next repeat day
      const nextNotifIds = await scheduleAlarmsForAlarmItem(updatedAlarm);
      updatedAlarm.notificationIds = nextNotifIds;
    }

    const updatedAlarms = [...currentAlarms];
    updatedAlarms[index] = updatedAlarm;

    set({ alarms: updatedAlarms, activeRinging: null });
    await AlarmStorage.saveAlarms(updatedAlarms);
  },

  snoozeAlarm: async (alarmId, minutes = 10) => {
    // Dismiss current overlay
    set({ activeRinging: null });
  },

  setLoveNoteGreeting: async (note) => {
    set({ loveNoteGreeting: note });
    await AlarmStorage.saveLoveNoteGreeting(note);
  },

  setActiveRinging: (ringing) => {
    set({ activeRinging: ringing });
  },
}));
