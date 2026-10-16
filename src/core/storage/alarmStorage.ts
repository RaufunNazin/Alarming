import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlarmItem } from '../../modules/interval-alarm/types';

const ALARMS_STORAGE_KEY = '@amour_alarms_list_v1';
const GREETING_STORAGE_KEY = '@amour_love_note_greeting_v1';

export const AlarmStorage = {
  async getAlarms(): Promise<AlarmItem[]> {
    try {
      const data = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading alarms from storage:', e);
    }
    // Default initial alarm (e.g. 06:30 AM to 07:30 AM interval alarm)
    return [
      {
        id: 'default_morning_wakeup',
        type: 'interval',
        label: 'Morning Wakeup',
        isEnabled: true,
        startHour: 6,
        startMinute: 30,
        endHour: 7,
        endMinute: 30,
        intervalMinutes: 10,
        repeatDays: [1, 2, 3, 4, 5], // Mon-Fri
        isOneOff: false,
        dismissedForToday: false,
      },
    ];
  },

  async saveAlarms(alarms: AlarmItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
    } catch (e) {
      console.warn('Error saving alarms to storage:', e);
    }
  },

  async getLoveNoteGreeting(): Promise<string> {
    try {
      const note = await AsyncStorage.getItem(GREETING_STORAGE_KEY);
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
};
