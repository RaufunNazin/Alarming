export type AlarmType = 'interval' | 'single';

export interface AlarmItem {
  id: string;
  type: AlarmType;
  label: string;
  isEnabled: boolean;

  // Primary time (For Single alarms: the ring time. For Interval: the start time)
  startHour: number;   // 0-23
  startMinute: number; // 0-59

  // Interval-only properties
  endHour?: number;    // 0-23
  endMinute?: number;  // 0-59
  intervalMinutes?: number; // 5, 10, 20, or custom (e.g. 7)

  // Repeat schedule (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
  // Empty array [] indicates a "One-off" alarm that turns off after ringing.
  repeatDays: number[];
  isOneOff?: boolean;

  // Generated timestamps for display and tracking
  generatedSequence?: string[]; // e.g. ["06:30 AM", "06:40 AM", "06:50 AM"]
  
  // State tracking
  dismissedForToday?: boolean;
  lastDismissedDate?: string; // 'YYYY-MM-DD'
  notificationIds?: string[];
}

export interface ActiveRingingAlarm {
  alarm: AlarmItem;
  currentStepIndex?: number;
  totalSteps?: number;
  currentTimeString: string;
}
