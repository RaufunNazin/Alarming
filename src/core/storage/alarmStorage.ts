import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivePowerNap, AlarmItem, AlarmType } from '../../modules/interval-alarm/types';

const ALARMS_STORAGE_KEY = '@alarming_alarms_list_v1';
const LEGACY_ALARMS_STORAGE_KEY = '@amour_alarms_list_v1';

const GREETING_STORAGE_KEY = '@alarming_greeting_v1';
const LEGACY_GREETING_STORAGE_KEY = '@amour_love_note_greeting_v1';

const LAST_SELECTED_TYPE_KEY = '@alarming_last_selected_alarm_type_v1';
const LEGACY_LAST_SELECTED_TYPE_KEY = '@amour_last_selected_alarm_type_v1';

const SETTINGS_STORAGE_KEY = '@alarming_settings_v1';
const POWER_NAP_STORAGE_KEY = '@alarming_active_power_nap_v1';

export const AlarmStorage = {
  async getAlarms(): Promise<AlarmItem[]> {
    try {
      let data = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
      if (!data) {
        // Seamless migration from legacy storage key
        data = await AsyncStorage.getItem(LEGACY_ALARMS_STORAGE_KEY);
        if (data) {
          await AsyncStorage.setItem(ALARMS_STORAGE_KEY, data);
        }
      }
      if (data) {
        const parsed: AlarmItem[] = JSON.parse(data);
        // Clean up legacy seeded default alarm if previously stored
        return parsed.filter((a) => a.id !== 'default_morning_wakeup');
      }
    } catch (e) {
      console.warn('Error reading alarms from storage:', e);
    }
    return [];
  },

  async saveAlarms(alarms: AlarmItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
    } catch (e) {
      console.warn('Error saving alarms to storage:', e);
    }
  },

  async getLastSelectedAlarmType(): Promise<AlarmType> {
    try {
      let type = await AsyncStorage.getItem(LAST_SELECTED_TYPE_KEY);
      if (!type) {
        type = await AsyncStorage.getItem(LEGACY_LAST_SELECTED_TYPE_KEY);
      }
      if (type === 'single' || type === 'interval' || type === 'offset') {
        return type;
      }
    } catch (e) {
      console.warn('Error reading last selected alarm type:', e);
    }
    return 'single';
  },

  async saveLastSelectedAlarmType(type: AlarmType): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SELECTED_TYPE_KEY, type);
    } catch (e) {
      console.warn('Error saving last selected alarm type:', e);
    }
  },

  async getLoveNoteGreeting(): Promise<string> {
    try {
      let note = await AsyncStorage.getItem(GREETING_STORAGE_KEY);
      if (!note) {
        note = await AsyncStorage.getItem(LEGACY_GREETING_STORAGE_KEY);
      }
      if (note) return note;
    } catch (e) {
      console.warn('Error reading greeting:', e);
    }
    return 'Good morning, my love';
  },

  async saveLoveNoteGreeting(note: string): Promise<void> {
    try {
      await AsyncStorage.setItem(GREETING_STORAGE_KEY, note);
    } catch (e) {
      console.warn('Error saving greeting:', e);
    }
  },

  async getSettings<T extends Record<string, unknown>>(): Promise<Partial<T> | null> {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as Partial<T>;
      }
    } catch (e) {
      console.warn('Error reading settings from storage:', e);
    }
    return null;
  },

  async saveSettings<T extends Record<string, unknown>>(settings: T): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Error saving settings to storage:', e);
    }
  },

  async getActivePowerNap(): Promise<ActivePowerNap | null> {
    try {
      const raw = await AsyncStorage.getItem(POWER_NAP_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ActivePowerNap;
        if (parsed && typeof parsed.endsAt === 'number' && parsed.endsAt > Date.now()) {
          return parsed;
        }
        await AsyncStorage.removeItem(POWER_NAP_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Error reading power nap from storage:', e);
    }
    return null;
  },

  async saveActivePowerNap(nap: ActivePowerNap | null): Promise<void> {
    try {
      if (!nap) {
        await AsyncStorage.removeItem(POWER_NAP_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(POWER_NAP_STORAGE_KEY, JSON.stringify(nap));
      }
    } catch (e) {
      console.warn('Error saving power nap to storage:', e);
    }
  },
};
