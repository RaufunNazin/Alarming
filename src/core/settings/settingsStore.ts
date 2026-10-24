import { create } from 'zustand';
import { AlarmStorage } from '../storage/alarmStorage';

export type ThemeMode = 'dark' | 'light';
export type AppLanguage = 'en' | 'bn';
export type IntervalModeType = 'standard' | 'escalating';
export type DefaultOffsetDirection = 'before' | 'after';
export type VolumeButtonAction = 'snooze' | 'dismiss' | 'none';

export const DEFAULT_ALARM_CATEGORIES = [
  'Work',
  'Personal',
  'Workout',
  'Medication',
];

export interface AppSettings {
  themeMode: ThemeMode;
  language: AppLanguage;
  intervalModeType: IntervalModeType;
  defaultIntervalMinutes: number;
  defaultAlarmCount: number;
  defaultWindowDurationMinutes: number;
  defaultOffsetDirection: DefaultOffsetDirection;
  defaultSnoozeMinutes: number;
  defaultPowerNapMinutes: number;
  showAlarmSequenceSection: boolean;
  showCreationAdvancedControls: boolean;
  enableKeyboardTimeInput: boolean;
  showPowerNapButton: boolean;
  showToastBanners: boolean;
  enableSafetyCheckBanner: boolean;
  volumeButtonAction: VolumeButtonAction;
  earlyDismissalWindowMinutes: number;
  categories: string[];
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeMode: 'dark',
  language: 'en',
  intervalModeType: 'standard',
  defaultIntervalMinutes: 10,
  defaultAlarmCount: 10,
  defaultWindowDurationMinutes: 60,
  defaultOffsetDirection: 'before',
  defaultSnoozeMinutes: 10,
  defaultPowerNapMinutes: 20,
  showAlarmSequenceSection: true,
  showCreationAdvancedControls: true,
  enableKeyboardTimeInput: true,
  showPowerNapButton: true,
  showToastBanners: true,
  enableSafetyCheckBanner: true,
  volumeButtonAction: 'snooze',
  earlyDismissalWindowMinutes: 45,
  categories: DEFAULT_ALARM_CATEGORIES,
};

interface SettingsState extends AppSettings {
  isHydrated: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  removeCategory: (name: string) => Promise<void>;
  resetSettings: () => Promise<void>;
}

function pickPersistedSettings(state: SettingsState): AppSettings {
  return {
    themeMode: state.themeMode,
    language: state.language,
    intervalModeType: state.intervalModeType,
    defaultIntervalMinutes: state.defaultIntervalMinutes,
    defaultAlarmCount: state.defaultAlarmCount,
    defaultWindowDurationMinutes: state.defaultWindowDurationMinutes,
    defaultOffsetDirection: state.defaultOffsetDirection,
    defaultSnoozeMinutes: state.defaultSnoozeMinutes,
    defaultPowerNapMinutes: state.defaultPowerNapMinutes,
    showAlarmSequenceSection: state.showAlarmSequenceSection,
    showCreationAdvancedControls: state.showCreationAdvancedControls,
    enableKeyboardTimeInput: state.enableKeyboardTimeInput,
    showPowerNapButton: state.showPowerNapButton,
    showToastBanners: state.showToastBanners,
    enableSafetyCheckBanner: state.enableSafetyCheckBanner,
    volumeButtonAction: state.volumeButtonAction,
    earlyDismissalWindowMinutes: state.earlyDismissalWindowMinutes,
    categories: state.categories,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_APP_SETTINGS,
  isHydrated: false,

  loadSettings: async () => {
    try {
      const parsed = await AlarmStorage.getSettings<Record<string, unknown>>();
      if (parsed) {
        set({
          ...DEFAULT_APP_SETTINGS,
          ...(parsed as Partial<AppSettings>),
          categories: Array.isArray(parsed.categories)
            ? (parsed.categories as string[])
            : DEFAULT_ALARM_CATEGORIES,
          isHydrated: true,
        });
        return;
      }
    } catch (e) {
      console.warn('Error loading settings from storage:', e);
    }
    set({ isHydrated: true });
  },

  updateSettings: async (updates) => {
    set((state) => ({ ...state, ...updates }));
    await AlarmStorage.saveSettings(
      pickPersistedSettings(get()) as unknown as Record<string, unknown>
    );
  },

  addCategory: async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = get().categories;
    if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    const next = [...current, trimmed];
    set({ categories: next });
    await AlarmStorage.saveSettings(
      pickPersistedSettings(get()) as unknown as Record<string, unknown>
    );
  },

  removeCategory: async (name: string) => {
    const next = get().categories.filter((c) => c !== name);
    set({ categories: next });
    await AlarmStorage.saveSettings(
      pickPersistedSettings(get()) as unknown as Record<string, unknown>
    );
  },

  resetSettings: async () => {
    set({ ...DEFAULT_APP_SETTINGS, isHydrated: true });
    await AlarmStorage.saveSettings(
      DEFAULT_APP_SETTINGS as unknown as Record<string, unknown>
    );
  },
}));
