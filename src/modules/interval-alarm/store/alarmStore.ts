import { create } from 'zustand';
import { AlarmItem, ActiveRingingAlarm, AlarmType, ActivePowerNap } from '../types';
import { AlarmStorage } from '../../../core/storage/alarmStorage';
import {
  scheduleAlarmsForAlarmItem,
  scheduleSnoozeNotification,
  cancelAllScheduledNotificationsForAlarm,
  dismissPresentedNotificationsForAlarm,
  checkNotificationPermissions,
  schedulePowerNapNotification,
  cancelPowerNapNotification,
  MAX_SCHEDULED_STEPS_PER_ALARM,
} from '../../../core/notifications/alarmNotifier';
import { alarmSoundPlayer } from '../../../core/audio/alarmSoundPlayer';
import {
  getAlarmToastMessage,
  formatTime12h,
  getAlarmSteps,
  getUpcomingAlarmStepDates,
  findDueAlarmStepAtTime,
  getLocalDateString,
  formatSkippedDateLabel,
} from '../engine/intervalEngine';
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { formatNumberLocalized, TRANSLATIONS } from '../../../core/i18n/translations';

interface AlarmState {
  alarms: AlarmItem[];
  activePowerNap: ActivePowerNap | null;
  activeRinging: ActiveRingingAlarm | null;
  loveNoteGreeting: string;
  lastSelectedType: AlarmType;
  isInitialized: boolean;
  toastMessage: string | null;
  toastActionLabel: string | null;
  onToastAction: (() => void) | null;
  pendingDeleteAlarm: { alarm: AlarmItem; index: number } | null;

  // Actions
  initialize: () => Promise<void>;
  addAlarm: (alarmData: Omit<AlarmItem, 'id'>) => Promise<string>;
  startPowerNap: (minutes?: number, forceReplace?: boolean) => Promise<void>;
  cancelPowerNap: () => Promise<void>;
  updateAlarm: (id: string, updates: Partial<AlarmItem>) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  softDeleteAlarm: (id: string) => Promise<void>;
  undoDeleteAlarm: () => Promise<void>;
  duplicateAlarm: (id: string) => Promise<string | undefined>;
  toggleSkipNextOccurrence: (id: string) => Promise<void>;
  dismissUpcomingToday: (id: string) => Promise<void>;
  toggleCategoryAlarms: (category: string, enable: boolean) => Promise<void>;
  toggleAlarm: (id: string) => Promise<void>;
  dismissAllRemainingForToday: (alarmId: string) => Promise<void>;
  dismissSingleAlarm: (alarmId: string) => Promise<void>;
  snoozeAlarm: (alarmId: string, minutes?: number) => Promise<void>;
  setLoveNoteGreeting: (note: string) => Promise<void>;
  setLastSelectedType: (type: AlarmType) => Promise<void>;
  setActiveRinging: (ringing: ActiveRingingAlarm | null) => void;
  triggerFromNotification: (payload: {
    alarmId: string;
    stepIndex?: number;
    totalSteps?: number;
    timeString?: string;
    cycleDateStr?: string;
  }) => void;
  showToast: (message: string, actionLabel?: string, onAction?: () => void) => void;
  hideToast: () => void;
  checkAlarmTriggerTick: () => void;
}

// In-memory set to prevent double-firing the same step in the same minute/cycle
const triggeredMinutesSet = new Set<string>();
let pendingDeleteTimeout: ReturnType<typeof setTimeout> | null = null;
let lastCheckedMinuteStartMs = 0;
let lastCheckedAlarmsRef: AlarmItem[] | null = null;

function buildStepDedupKey(alarmId: string, stepIndex: number, cycleDateStr: string): string {
  return `${alarmId}_step_${stepIndex}_${cycleDateStr}`;
}

export const useAlarmStore = create<AlarmState>((set, get) => {
  /**
   * Synchronizes OS notifications for a single alarm in the background without blocking UI state.
   */
  const syncAlarmNotificationsInBackground = async (alarm: AlarmItem) => {
    try {
      const notifIds = await scheduleAlarmsForAlarmItem(alarm);
      const currentAlarms = get().alarms;
      const idx = currentAlarms.findIndex((a) => a.id === alarm.id);
      if (idx === -1 || !currentAlarms[idx].isEnabled) {
        return;
      }
      const nextAlarms = [...currentAlarms];
      nextAlarms[idx] = {
        ...nextAlarms[idx],
        notificationIds: notifIds,
      };
      set({ alarms: nextAlarms });
      await AlarmStorage.saveAlarms(nextAlarms);
    } catch (e) {
      console.warn('Background alarm notification sync failed:', e);
    }
  };

  return {
    alarms: [],
    activePowerNap: null,
    activeRinging: null,
    loveNoteGreeting: 'Good morning, my love',
    lastSelectedType: 'single',
    isInitialized: false,
    toastMessage: null,
    toastActionLabel: null,
    onToastAction: null,
    pendingDeleteAlarm: null,

    showToast: (message: string, actionLabel?: string, onAction?: () => void) => {
      if (!actionLabel && !useSettingsStore.getState().showToastBanners) return;
      set({
        toastMessage: message,
        toastActionLabel: actionLabel ?? null,
        onToastAction: onAction ?? null,
      });
    },
    hideToast: () =>
      set({
        toastMessage: null,
        toastActionLabel: null,
        onToastAction: null,
      }),

    initialize: async () => {
      if (get().isInitialized) return;
      const [alarms, loveNoteGreeting, lastSelectedType, activePowerNap] = await Promise.all([
        AlarmStorage.getAlarms(),
        AlarmStorage.getLoveNoteGreeting(),
        AlarmStorage.getLastSelectedAlarmType(),
        AlarmStorage.getActivePowerNap(),
      ]);

      const nowMs = Date.now();
      const validPowerNap =
        activePowerNap && activePowerNap.endsAt > nowMs - 2 * 60 * 1000
          ? activePowerNap
          : null;
      if (activePowerNap && !validPowerNap) {
        void AlarmStorage.saveActivePowerNap(null);
      }

      // Render stored alarms immediately without waiting on OS notification scheduling
      set({
        alarms,
        loveNoteGreeting,
        lastSelectedType,
        activePowerNap: validPowerNap,
        isInitialized: true,
      });

      // Synchronize active alarms in the background
      void Promise.all(
        alarms
          .filter((a) => a.isEnabled)
          .map((alarm) => syncAlarmNotificationsInBackground(alarm))
      );
    },

    addAlarm: async (alarmData) => {
      const nowMs = Date.now();
      const id = `alarm_${nowMs}_${Math.random().toString(36).substring(2, 6)}`;
      const steps = getAlarmSteps(alarmData);
      const newAlarm: AlarmItem = {
        ...alarmData,
        id,
        enabledAt: nowMs,
        generatedSequence:
          alarmData.type !== 'single' ? steps.map((s) => s.timeString) : undefined,
        notificationIds: [],
      };

      const showToasts = useSettingsStore.getState().showToastBanners;
      const toastMsg =
        newAlarm.isEnabled && showToasts ? getAlarmToastMessage(newAlarm) : null;
      const updatedAlarms = [...get().alarms, newAlarm];

      // Update UI state immediately (<1ms)
      set({
        alarms: updatedAlarms,
        lastSelectedType: alarmData.type,
        ...(toastMsg ? { toastMessage: toastMsg } : {}),
      });

      // Persist and schedule OS notifications asynchronously in the background
      void AlarmStorage.saveAlarms(updatedAlarms);
      void AlarmStorage.saveLastSelectedAlarmType(alarmData.type);

      if (newAlarm.isEnabled) {
        void syncAlarmNotificationsInBackground(newAlarm);
        void checkNotificationPermissions().then((perm) => {
          if (!perm.granted && !perm.canAskAgain) {
            set({
              toastMessage: 'Note: Notifications disabled. Enable in settings to hear alarms.',
            });
          }
        });
      }

      return id;
    },

    startPowerNap: async (minutes, forceReplace = false) => {
      const existingNap = get().activePowerNap;
      if (existingNap && existingNap.endsAt > Date.now() && !forceReplace) {
        return;
      }
      if (existingNap?.notificationId) {
        void cancelPowerNapNotification(existingNap.notificationId);
      }

      const settings = useSettingsStore.getState();
      const napMinutes = minutes ?? settings.defaultPowerNapMinutes ?? 20;
      const endsAt = Date.now() + napMinutes * 60 * 1000;
      const t = TRANSLATIONS[settings.language];

      const nextNap: ActivePowerNap = {
        endsAt,
        durationMinutes: napMinutes,
      };

      set({
        activePowerNap: nextNap,
        ...(settings.showToastBanners
          ? {
              toastMessage: t.powerNapStartedToast(napMinutes),
              toastActionLabel: null,
              onToastAction: null,
            }
          : {}),
      });

      void AlarmStorage.saveActivePowerNap(nextNap);

      const notifId = await schedulePowerNapNotification(endsAt, t.powerNapLabel);
      if (notifId && get().activePowerNap?.endsAt === endsAt) {
        const updatedNap: ActivePowerNap = { ...nextNap, notificationId: notifId };
        set({ activePowerNap: updatedNap });
        void AlarmStorage.saveActivePowerNap(updatedNap);
      }
    },

    cancelPowerNap: async () => {
      const existingNap = get().activePowerNap;
      if (get().activeRinging?.alarm.id === 'power_nap') {
        alarmSoundPlayer.stopAlarmSound();
      }

      const settings = useSettingsStore.getState();
      const t = TRANSLATIONS[settings.language];

      set({
        activePowerNap: null,
        ...(get().activeRinging?.alarm.id === 'power_nap' ? { activeRinging: null } : {}),
        ...(settings.showToastBanners
          ? {
              toastMessage: t.powerNapCancelledToast,
              toastActionLabel: null,
              onToastAction: null,
            }
          : {}),
      });

      void AlarmStorage.saveActivePowerNap(null);
      void cancelPowerNapNotification(existingNap?.notificationId);
    },

    setLastSelectedType: async (type) => {
      set({ lastSelectedType: type });
      await AlarmStorage.saveLastSelectedAlarmType(type);
    },

    updateAlarm: async (id, updates) => {
      const currentAlarms = get().alarms;
      const index = currentAlarms.findIndex((a) => a.id === id);
      if (index === -1) return;

      const existing = currentAlarms[index];

      // Determine if schedule timing or repeat schedule changed
      const scheduleChanged =
        (updates.startHour !== undefined && updates.startHour !== existing.startHour) ||
        (updates.startMinute !== undefined && updates.startMinute !== existing.startMinute) ||
        (updates.endHour !== undefined && updates.endHour !== existing.endHour) ||
        (updates.endMinute !== undefined && updates.endMinute !== existing.endMinute) ||
        (updates.intervalMinutes !== undefined &&
          updates.intervalMinutes !== existing.intervalMinutes) ||
        (updates.offsetDirection !== undefined &&
          updates.offsetDirection !== existing.offsetDirection) ||
        (updates.alarmCount !== undefined && updates.alarmCount !== existing.alarmCount) ||
        (updates.isEscalating !== undefined && updates.isEscalating !== existing.isEscalating) ||
        (updates.repeatDays !== undefined &&
          JSON.stringify(updates.repeatDays) !== JSON.stringify(existing.repeatDays || [])) ||
        (updates.customSteps !== undefined &&
          JSON.stringify(updates.customSteps) !== JSON.stringify(existing.customSteps || [])) ||
        (updates.type !== undefined && updates.type !== existing.type);

      const newlyEnabled = updates.isEnabled === true && !existing.isEnabled;

      const mergedBase: AlarmItem = {
        ...existing,
        ...updates,
      };
      const steps = getAlarmSteps(mergedBase);

      const updatedAlarm: AlarmItem = {
        ...mergedBase,
        enabledAt: scheduleChanged || newlyEnabled ? Date.now() : existing.enabledAt,
        pausedUntil:
          scheduleChanged || newlyEnabled
            ? undefined
            : 'pausedUntil' in updates
              ? updates.pausedUntil
              : existing.pausedUntil,
        generatedSequence:
          mergedBase.type !== 'single' ? steps.map((s) => s.timeString) : undefined,
        // If time or repeat schedule changed, reset dismissed status
        dismissedForToday: scheduleChanged
          ? false
          : (updates.dismissedForToday ?? existing.dismissedForToday),
        // Preserve snooze unless explicitly changed in updates or schedule changed
        snoozedUntil:
          'snoozedUntil' in updates
            ? updates.snoozedUntil
            : scheduleChanged
              ? undefined
              : existing.snoozedUntil,
      };

      const showToasts = useSettingsStore.getState().showToastBanners;
      const toastMsg =
        showToasts && updatedAlarm.isEnabled && (scheduleChanged || newlyEnabled)
          ? getAlarmToastMessage(updatedAlarm)
          : null;

      const updatedAlarms = [...currentAlarms];
      updatedAlarms[index] = updatedAlarm;

      // Update UI state immediately
      set({
        alarms: updatedAlarms,
        ...(toastMsg
          ? { toastMessage: toastMsg, toastActionLabel: null, onToastAction: null }
          : {}),
      });
      void AlarmStorage.saveAlarms(updatedAlarms);

      if (updatedAlarm.isEnabled) {
        if (
          scheduleChanged ||
          newlyEnabled ||
          updates.notificationIds === undefined ||
          updates.skipNextDate !== existing.skipNextDate
        ) {
          void syncAlarmNotificationsInBackground(updatedAlarm);
        }
      } else {
        void cancelAllScheduledNotificationsForAlarm(existing);
      }
    },

    deleteAlarm: async (id) => {
      const currentAlarms = get().alarms;
      const target = currentAlarms.find((a) => a.id === id);

      if (get().activeRinging?.alarm.id === id) {
        alarmSoundPlayer.stopAlarmSound();
      }

      const updatedAlarms = currentAlarms.filter((a) => a.id !== id);

      // Update UI state immediately so deletion never lags
      set({
        alarms: updatedAlarms,
        ...(get().activeRinging?.alarm.id === id ? { activeRinging: null } : {}),
      });

      void AlarmStorage.saveAlarms(updatedAlarms);

      if (target) {
        void cancelAllScheduledNotificationsForAlarm(target);
      }
    },

    softDeleteAlarm: async (id) => {
      const currentAlarms = get().alarms;
      const index = currentAlarms.findIndex((a) => a.id === id);
      if (index === -1) return;

      const target = currentAlarms[index];

      if (get().activeRinging?.alarm.id === id) {
        alarmSoundPlayer.stopAlarmSound();
      }

      if (pendingDeleteTimeout) {
        clearTimeout(pendingDeleteTimeout);
        pendingDeleteTimeout = null;
      }

      const updatedAlarms = currentAlarms.filter((a) => a.id !== id);
      const lang = useSettingsStore.getState().language;
      const t = TRANSLATIONS[lang];

      set({
        alarms: updatedAlarms,
        pendingDeleteAlarm: { alarm: target, index },
        toastMessage: t.alarmDeletedToast,
        toastActionLabel: t.undoBtn,
        onToastAction: () => {
          void get().undoDeleteAlarm();
        },
        ...(get().activeRinging?.alarm.id === id ? { activeRinging: null } : {}),
      });

      void AlarmStorage.saveAlarms(updatedAlarms);
      void cancelAllScheduledNotificationsForAlarm(target);

      pendingDeleteTimeout = setTimeout(() => {
        set({ pendingDeleteAlarm: null });
        pendingDeleteTimeout = null;
      }, 5200);
    },

    undoDeleteAlarm: async () => {
      const pending = get().pendingDeleteAlarm;
      if (!pending) return;

      if (pendingDeleteTimeout) {
        clearTimeout(pendingDeleteTimeout);
        pendingDeleteTimeout = null;
      }

      const currentAlarms = [...get().alarms];
      const insertIndex = Math.min(Math.max(0, pending.index), currentAlarms.length);
      currentAlarms.splice(insertIndex, 0, pending.alarm);

      const lang = useSettingsStore.getState().language;
      const t = TRANSLATIONS[lang];

      set({
        alarms: currentAlarms,
        pendingDeleteAlarm: null,
        toastMessage: t.alarmRestoredToast,
        toastActionLabel: null,
        onToastAction: null,
      });

      void AlarmStorage.saveAlarms(currentAlarms);
      if (pending.alarm.isEnabled) {
        void syncAlarmNotificationsInBackground(pending.alarm);
      }
    },

    duplicateAlarm: async (id) => {
      const currentAlarms = get().alarms;
      const target = currentAlarms.find((a) => a.id === id);
      if (!target) return undefined;

      const lang = useSettingsStore.getState().language;
      const t = TRANSLATIONS[lang];
      const baseLabel = target.label?.trim() || (lang === 'bn' ? 'অ্যালার্ম' : 'Alarm');
      const copyLabel = `${baseLabel} ${t.copySuffix}`;

      const nowMs = Date.now();
      const newId = `alarm_${nowMs}_${Math.random().toString(36).substring(2, 6)}`;
      const clonedAlarm: AlarmItem = {
        ...target,
        id: newId,
        label: copyLabel,
        isEnabled: true,
        enabledAt: nowMs,
        dismissedForToday: false,
        lastDismissedDate: undefined,
        skipNextDate: undefined,
        snoozedUntil: undefined,
        notificationIds: [],
        repeatDays: [...(target.repeatDays || [])],
        customSteps: target.customSteps ? target.customSteps.map((s) => ({ ...s })) : undefined,
      };

      const updatedAlarms = [...currentAlarms, clonedAlarm];
      set({
        alarms: updatedAlarms,
        toastMessage: t.alarmDuplicatedToast,
        toastActionLabel: null,
        onToastAction: null,
      });

      void AlarmStorage.saveAlarms(updatedAlarms);
      void syncAlarmNotificationsInBackground(clonedAlarm);
      return newId;
    },

    toggleSkipNextOccurrence: async (id) => {
      const currentAlarms = get().alarms;
      const index = currentAlarms.findIndex((a) => a.id === id);
      if (index === -1) return;

      const alarm = currentAlarms[index];
      const lang = useSettingsStore.getState().language;
      const t = TRANSLATIONS[lang];

      let nextSkipDate: string | undefined;
      let toastMsg: string;

      if (alarm.skipNextDate) {
        nextSkipDate = undefined;
        toastMsg = t.resumedScheduleToast;
      } else {
        const upcomingSteps = getUpcomingAlarmStepDates(alarm, new Date(), true);
        const targetCycleDate =
          upcomingSteps[0]?.cycleDateStr || getLocalDateString(new Date());
        nextSkipDate = targetCycleDate;
        toastMsg = `${t.skippingNextPrefix} ${formatSkippedDateLabel(targetCycleDate)}`;
      }

      const updatedAlarm: AlarmItem = {
        ...alarm,
        skipNextDate: nextSkipDate,
      };

      const updatedAlarms = [...currentAlarms];
      updatedAlarms[index] = updatedAlarm;

      set({
        alarms: updatedAlarms,
        toastMessage: toastMsg,
        toastActionLabel: null,
        onToastAction: null,
      });

      void AlarmStorage.saveAlarms(updatedAlarms);
      if (updatedAlarm.isEnabled) {
        void syncAlarmNotificationsInBackground(updatedAlarm);
      }
    },

    dismissUpcomingToday: async (id) => {
      const currentAlarms = get().alarms;
      const index = currentAlarms.findIndex((a) => a.id === id);
      if (index === -1) return;

      const alarm = currentAlarms[index];
      const upcoming = getUpcomingAlarmStepDates(alarm, new Date());
      const cycleDateStr = upcoming[0]?.cycleDateStr || getLocalDateString(new Date());
      const isOneOff = alarm.isOneOff || !alarm.repeatDays || alarm.repeatDays.length === 0;
      const lang = useSettingsStore.getState().language;
      const t = TRANSLATIONS[lang];

      const updatedAlarm: AlarmItem = {
        ...alarm,
        isEnabled: isOneOff ? false : alarm.isEnabled,
        dismissedForToday: true,
        lastDismissedDate: cycleDateStr,
        snoozedUntil: undefined,
        notificationIds: [],
      };

      const updatedAlarms = [...currentAlarms];
      updatedAlarms[index] = updatedAlarm;

      set({
        alarms: updatedAlarms,
        toastMessage: t.earlyDismissConfirmToast,
        toastActionLabel: null,
        onToastAction: null,
      });

      void AlarmStorage.saveAlarms(updatedAlarms);
      if (isOneOff) {
        void cancelAllScheduledNotificationsForAlarm(alarm);
      } else {
        void dismissPresentedNotificationsForAlarm(id);
        void syncAlarmNotificationsInBackground(updatedAlarm);
      }
    },

    toggleCategoryAlarms: async (category, enable) => {
      const currentAlarms = get().alarms;
      const matchingAlarms: AlarmItem[] = [];
      const nowMs = Date.now();
      const pauseUntilMs = nowMs + 24 * 60 * 60 * 1000;

      const updatedAlarms = currentAlarms.map((alarm) => {
        if (alarm.category === category) {
          if (!enable && !alarm.isEnabled) {
            return alarm;
          }
          const updated: AlarmItem = enable
            ? {
                ...alarm,
                isEnabled: true,
                pausedUntil: undefined,
                enabledAt: nowMs,
                dismissedForToday: false,
                snoozedUntil: undefined,
              }
            : {
                ...alarm,
                pausedUntil: pauseUntilMs,
                dismissedForToday: false,
                snoozedUntil: undefined,
              };
          matchingAlarms.push(updated);
          return updated;
        }
        return alarm;
      });

      const activeRing = get().activeRinging;
      if (!enable && activeRing && activeRing.alarm.category === category) {
        alarmSoundPlayer.stopAlarmSound();
      }

      const lang = useSettingsStore.getState().language;
      const toastMsg =
        lang === 'bn'
          ? enable
            ? `সব ${category} অ্যালার্ম চালু করা হয়েছে`
            : `সব ${category} অ্যালার্ম ২৪ ঘণ্টার জন্য বন্ধ করা হয়েছে`
          : enable
            ? `Turned on all ${category} alarms`
            : `Turned off all ${category} alarms for 24 hours`;

      set({
        alarms: updatedAlarms,
        ...(!enable && activeRing && activeRing.alarm.category === category
          ? { activeRinging: null }
          : {}),
        toastMessage: toastMsg,
        toastActionLabel: null,
        onToastAction: null,
      });

      void AlarmStorage.saveAlarms(updatedAlarms);

      for (const item of matchingAlarms) {
        if (item.isEnabled) {
          void syncAlarmNotificationsInBackground(item);
        } else {
          void cancelAllScheduledNotificationsForAlarm(item);
        }
      }
    },

    toggleAlarm: async (id) => {
      const currentAlarms = get().alarms;
      const index = currentAlarms.findIndex((a) => a.id === id);
      if (index === -1) return;

      const alarm = currentAlarms[index];
      const isPaused = Boolean(alarm.pausedUntil && alarm.pausedUntil > Date.now());
      const willEnable = isPaused ? true : !alarm.isEnabled;

      const updatedAlarm: AlarmItem = {
        ...alarm,
        isEnabled: willEnable,
        pausedUntil: undefined,
        enabledAt: willEnable ? Date.now() : alarm.enabledAt,
        dismissedForToday: false,
        snoozedUntil: undefined,
        notificationIds: willEnable ? alarm.notificationIds : [],
      };

      const showToasts = useSettingsStore.getState().showToastBanners;
      const toastMsg =
        willEnable && showToasts ? getAlarmToastMessage(updatedAlarm) : null;

      if (!willEnable && get().activeRinging?.alarm.id === id) {
        alarmSoundPlayer.stopAlarmSound();
      }

      const updatedAlarms = [...currentAlarms];
      updatedAlarms[index] = updatedAlarm;

      // Update UI state immediately
      set({
        alarms: updatedAlarms,
        ...(!willEnable && get().activeRinging?.alarm.id === id ? { activeRinging: null } : {}),
        ...(toastMsg ? { toastMessage: toastMsg } : {}),
      });

      void AlarmStorage.saveAlarms(updatedAlarms);

      if (willEnable) {
        void syncAlarmNotificationsInBackground(updatedAlarm);
        void checkNotificationPermissions().then((perm) => {
          if (!perm.granted && !perm.canAskAgain) {
            set({
              toastMessage: 'Note: Notifications disabled. Enable in settings to hear alarms.',
            });
          }
        });
      } else {
        void cancelAllScheduledNotificationsForAlarm(alarm);
      }
    },

    dismissAllRemainingForToday: async (alarmId) => {
      alarmSoundPlayer.stopAlarmSound();
      if (alarmId === 'power_nap') {
        set({ activeRinging: null, activePowerNap: null });
        void AlarmStorage.saveActivePowerNap(null);
        void cancelPowerNapNotification();
        return;
      }
      const currentAlarms = get().alarms;
      const index = currentAlarms.findIndex((a) => a.id === alarmId);
      if (index === -1) {
        set({ activeRinging: null });
        return;
      }

      const alarm = currentAlarms[index];
      const dueStep = findDueAlarmStepAtTime(alarm, new Date());
      const cycleDateStr = dueStep?.cycleDateStr || getLocalDateString(new Date());
      const isOneOff = alarm.isOneOff || !alarm.repeatDays || alarm.repeatDays.length === 0;

      const updatedAlarm: AlarmItem = {
        ...alarm,
        isEnabled: isOneOff ? false : alarm.isEnabled,
        dismissedForToday: true,
        lastDismissedDate: cycleDateStr,
        notificationIds: [],
        snoozedUntil: undefined,
      };

      const updatedAlarms = [...currentAlarms];
      updatedAlarms[index] = updatedAlarm;

      // Update UI immediately
      set({ alarms: updatedAlarms, activeRinging: null });
      void AlarmStorage.saveAlarms(updatedAlarms);

      if (isOneOff) {
        void cancelAllScheduledNotificationsForAlarm(alarm);
      } else {
        void dismissPresentedNotificationsForAlarm(alarmId);
        void syncAlarmNotificationsInBackground(updatedAlarm);
      }
    },

    dismissSingleAlarm: async (alarmId) => {
      alarmSoundPlayer.stopAlarmSound();
      if (alarmId === 'power_nap') {
        set({ activeRinging: null, activePowerNap: null });
        void AlarmStorage.saveActivePowerNap(null);
        void cancelPowerNapNotification();
        return;
      }
      const active = get().activeRinging;
      const currentAlarms = get().alarms;
      const index = currentAlarms.findIndex((a) => a.id === alarmId);
      if (index === -1) {
        set({ activeRinging: null });
        return;
      }

      const alarm = currentAlarms[index];
      const isSequence = alarm.type === 'interval' || alarm.type === 'offset';

      // Check if there are remaining future steps in the current active cycle after this minute
      const now = new Date();
      const endOfCurrentMinute = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        59,
        999
      );
      const upcomingAfterThisMinute = isSequence
        ? getUpcomingAlarmStepDates(alarm, endOfCurrentMinute)
        : [];

      const hasMoreStepsInCurrentCycle =
        isSequence &&
        ((upcomingAfterThisMinute.length > 0 && upcomingAfterThisMinute[0].stepIndex > 0) ||
          (active?.alarm.id === alarmId &&
            typeof active.currentStepIndex === 'number' &&
            typeof active.totalSteps === 'number' &&
            active.currentStepIndex < active.totalSteps - 1));

      if (hasMoreStepsInCurrentCycle) {
        // Dismiss ONLY the current step! Keep alarm enabled and replenish rolling notification window
        const updatedAlarm: AlarmItem = {
          ...alarm,
          snoozedUntil: undefined,
        };
        const updatedAlarms = [...currentAlarms];
        updatedAlarms[index] = updatedAlarm;

        set({ alarms: updatedAlarms, activeRinging: null });
        void AlarmStorage.saveAlarms(updatedAlarms);
        void dismissPresentedNotificationsForAlarm(alarmId);
        void syncAlarmNotificationsInBackground(updatedAlarm);
        return;
      }

      // Final step of sequence, or single alarm
      const isOneOff = alarm.isOneOff || !alarm.repeatDays || alarm.repeatDays.length === 0;
      const updatedAlarm: AlarmItem = {
        ...alarm,
        isEnabled: isOneOff ? false : alarm.isEnabled,
        snoozedUntil: undefined,
        notificationIds: [],
      };

      const updatedAlarms = [...currentAlarms];
      updatedAlarms[index] = updatedAlarm;

      set({ alarms: updatedAlarms, activeRinging: null });
      void AlarmStorage.saveAlarms(updatedAlarms);

      if (isOneOff) {
        void cancelAllScheduledNotificationsForAlarm(alarm);
      } else {
        void dismissPresentedNotificationsForAlarm(alarmId);
        void syncAlarmNotificationsInBackground(updatedAlarm);
      }
    },

    snoozeAlarm: async (alarmId, minutes) => {
      alarmSoundPlayer.stopAlarmSound();
      const settings = useSettingsStore.getState();
      const resolvedMinutes = minutes ?? settings.defaultSnoozeMinutes ?? 10;

      if (alarmId === 'power_nap') {
        const snoozedEndsAt = Date.now() + resolvedMinutes * 60 * 1000;
        const snoozeToast =
          settings.language === 'bn'
            ? `আরও ${formatNumberLocalized(resolvedMinutes, 'bn')} মিনিট পর আবার বাজবে`
            : `Snoozed for ${resolvedMinutes} minutes`;
        const nextNap: ActivePowerNap = {
          endsAt: snoozedEndsAt,
          durationMinutes: resolvedMinutes,
        };
        set({
          activeRinging: null,
          activePowerNap: nextNap,
          ...(settings.showToastBanners ? { toastMessage: snoozeToast } : {}),
        });
        void AlarmStorage.saveActivePowerNap(nextNap);
        const notifId = await schedulePowerNapNotification(
          snoozedEndsAt,
          TRANSLATIONS[settings.language].powerNapLabel
        );
        if (notifId && get().activePowerNap?.endsAt === snoozedEndsAt) {
          const updatedNap: ActivePowerNap = { ...nextNap, notificationId: notifId };
          set({ activePowerNap: updatedNap });
          void AlarmStorage.saveActivePowerNap(updatedNap);
        }
        return;
      }

      const currentAlarms = get().alarms;
      const index = currentAlarms.findIndex((a) => a.id === alarmId);
      if (index === -1) {
        set({ activeRinging: null });
        return;
      }

      const alarm = currentAlarms[index];
      const snoozedUntil = Date.now() + resolvedMinutes * 60 * 1000;

      const updatedAlarm: AlarmItem = {
        ...alarm,
        snoozedUntil,
      };

      const updatedAlarms = [...currentAlarms];
      updatedAlarms[index] = updatedAlarm;

      const snoozeToast =
        settings.language === 'bn'
          ? `আরও ${formatNumberLocalized(resolvedMinutes, 'bn')} মিনিট পর আবার বাজবে`
          : `Alarm snoozed for ${resolvedMinutes} minutes`;

      // Dismiss overlay & update state immediately
      set({
        alarms: updatedAlarms,
        activeRinging: null,
        ...(settings.showToastBanners ? { toastMessage: snoozeToast } : {}),
      });
      void AlarmStorage.saveAlarms(updatedAlarms);
      void dismissPresentedNotificationsForAlarm(alarmId);

      const snoozeNotifId = await scheduleSnoozeNotification(alarm, resolvedMinutes);
      if (snoozeNotifId) {
        const latestAlarms = get().alarms;
        const latestIdx = latestAlarms.findIndex((a) => a.id === alarmId);
        if (latestIdx !== -1) {
          const nextAlarms = [...latestAlarms];
          nextAlarms[latestIdx] = {
            ...nextAlarms[latestIdx],
            notificationIds: [...(nextAlarms[latestIdx].notificationIds || []), snoozeNotifId],
          };
          set({ alarms: nextAlarms });
          void AlarmStorage.saveAlarms(nextAlarms);
        }
      }
    },

    setLoveNoteGreeting: async (note) => {
      set({ loveNoteGreeting: note });
      await AlarmStorage.saveLoveNoteGreeting(note);
    },

    setActiveRinging: (ringing) => {
      set({ activeRinging: ringing });
    },

    triggerFromNotification: ({ alarmId, stepIndex, totalSteps, timeString, cycleDateStr }) => {
      if (alarmId === 'power_nap') {
        const now = new Date();
        const lang = useSettingsStore.getState().language;
        const syntheticNapAlarm: AlarmItem = {
          id: 'power_nap',
          type: 'single',
          label: TRANSLATIONS[lang].powerNapLabel,
          isEnabled: true,
          startHour: now.getHours(),
          startMinute: now.getMinutes(),
          repeatDays: [],
          isOneOff: true,
        };
        set({
          activePowerNap: null,
          activeRinging: {
            alarm: syntheticNapAlarm,
            currentStepIndex: 0,
            totalSteps: 1,
            currentTimeString:
              typeof timeString === 'string'
                ? timeString
                : formatTime12h(now.getHours(), now.getMinutes()),
          },
        });
        void AlarmStorage.saveActivePowerNap(null);
        return;
      }

      const currentAlarms = get().alarms;
      const target = currentAlarms.find((a) => a.id === alarmId);
      if (!target || !target.isEnabled) return;
      if (target.pausedUntil && target.pausedUntil > Date.now()) return;

      const resolvedStepIndex = typeof stepIndex === 'number' ? stepIndex : 0;
      const resolvedTotalSteps =
        typeof totalSteps === 'number' ? totalSteps : getAlarmSteps(target).length;
      const resolvedCycleDate = cycleDateStr || getLocalDateString(new Date());
      const dedupKey = buildStepDedupKey(alarmId, resolvedStepIndex, resolvedCycleDate);
      triggeredMinutesSet.add(dedupKey);

      set({
        activeRinging: {
          alarm: target,
          currentStepIndex: resolvedStepIndex,
          totalSteps: resolvedTotalSteps,
          currentTimeString:
            typeof timeString === 'string'
              ? timeString
              : formatTime12h(target.startHour, target.startMinute),
        },
      });
    },

    checkAlarmTriggerTick: () => {
      const now = new Date();
      const nowMs = now.getTime();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentAlarms = get().alarms;

      // 0. Check standalone Power Nap expiration on every 2s tick
      const currentNap = get().activePowerNap;
      if (currentNap && nowMs >= currentNap.endsAt) {
        const lang = useSettingsStore.getState().language;
        const timeStr = formatTime12h(currentHour, currentMinute);
        const syntheticNapAlarm: AlarmItem = {
          id: 'power_nap',
          type: 'single',
          label: TRANSLATIONS[lang].powerNapLabel,
          isEnabled: true,
          startHour: currentHour,
          startMinute: currentMinute,
          repeatDays: [],
          isOneOff: true,
        };
        set({
          activePowerNap: null,
          activeRinging: {
            alarm: syntheticNapAlarm,
            currentTimeString: timeStr,
            currentStepIndex: 0,
            totalSteps: 1,
          },
        });
        void AlarmStorage.saveActivePowerNap(null);
        void cancelPowerNapNotification(currentNap.notificationId);
        return;
      }

      // 1. Fast path: check active snooze expiration on every 2s tick (O(N) integer check)
      for (const alarm of currentAlarms) {
        if (!alarm.isEnabled) continue;
        if (alarm.snoozedUntil && nowMs >= alarm.snoozedUntil) {
          const timeStr = formatTime12h(currentHour, currentMinute);
          const steps = getAlarmSteps(alarm);
          const updated = currentAlarms.map((a) =>
            a.id === alarm.id ? { ...a, snoozedUntil: undefined } : a
          );
          set({
            alarms: updated,
            activeRinging: {
              alarm: { ...alarm, snoozedUntil: undefined },
              currentTimeString: timeStr,
              currentStepIndex: 0,
              totalSteps: steps.length,
            },
          });
          void AlarmStorage.saveAlarms(updated);
          return;
        }
      }

      // 2. Minute-boundary & alarm-state change gate:
      // Only run step generation and skip-date cleanup when the minute changes or alarms array updates
      const currentMinuteStartMs = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        currentHour,
        currentMinute,
        0,
        0
      ).getTime();

      if (
        currentMinuteStartMs === lastCheckedMinuteStartMs &&
        currentAlarms === lastCheckedAlarmsRef
      ) {
        return;
      }

      lastCheckedMinuteStartMs = currentMinuteStartMs;
      lastCheckedAlarmsRef = currentAlarms;

      // Prune deduplication set periodically to prevent memory accumulation
      if (triggeredMinutesSet.size > 240) {
        triggeredMinutesSet.clear();
      }

      const todayStr = getLocalDateString(now);
      const hasExpiredSkipOrPause = currentAlarms.some(
        (alarm) =>
          Boolean(alarm.skipNextDate && alarm.skipNextDate < todayStr) ||
          Boolean(alarm.pausedUntil && alarm.pausedUntil <= nowMs)
      );

      let cleanedAlarms = currentAlarms;
      if (hasExpiredSkipOrPause) {
        cleanedAlarms = currentAlarms.map((alarm) => {
          const clearSkip = Boolean(alarm.skipNextDate && alarm.skipNextDate < todayStr);
          const clearPause = Boolean(alarm.pausedUntil && alarm.pausedUntil <= nowMs);
          if (clearSkip || clearPause) {
            return {
              ...alarm,
              ...(clearSkip ? { skipNextDate: undefined } : {}),
              ...(clearPause ? { pausedUntil: undefined } : {}),
            };
          }
          return alarm;
        });
        lastCheckedAlarmsRef = cleanedAlarms;
        set({ alarms: cleanedAlarms });
        void AlarmStorage.saveAlarms(cleanedAlarms);
      }

      for (const alarm of cleanedAlarms) {
        if (!alarm.isEnabled) continue;

        // Check scheduled occurrence step for the current minute
        const dueStep = findDueAlarmStepAtTime(alarm, now);
        if (dueStep) {
          const dedupKey = buildStepDedupKey(
            alarm.id,
            dueStep.stepIndex,
            dueStep.cycleDateStr
          );
          if (!triggeredMinutesSet.has(dedupKey)) {
            triggeredMinutesSet.add(dedupKey);

            set({
              activeRinging: {
                alarm,
                currentTimeString: dueStep.timeString,
                currentStepIndex: dueStep.stepIndex,
                totalSteps: dueStep.totalSteps,
              },
            });

            // If this is a large sequence exceeding the rolling batch window,
            // replenish future OS notifications in the background as steps progress
            if (
              dueStep.totalSteps > MAX_SCHEDULED_STEPS_PER_ALARM &&
              dueStep.stepIndex > 0 &&
              dueStep.stepIndex % 8 === 0
            ) {
              void syncAlarmNotificationsInBackground(alarm);
            }
            return;
          }
        }
      }
    },
  };
});
