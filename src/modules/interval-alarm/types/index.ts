export type AlarmType = 'single' | 'interval' | 'offset';

export interface AlarmItem {
  id: string;
  type: AlarmType;
  label: string;
  isEnabled: boolean;

  // Primary time
  // For Single alarms: the ring time.
  // For Window Interval: the start time.
  // For Offset Interval: the target time.
  startHour: number;   // 0-23
  startMinute: number; // 0-59

  // Window Interval properties
  endHour?: number;    // 0-23
  endMinute?: number;  // 0-59

  // Interval duration in minutes (common to Window Interval and Offset Interval)
  intervalMinutes?: number; // e.g. 5, 10, 20

  // Offset Interval properties
  offsetDirection?: 'before' | 'after'; // default 'before'
  alarmCount?: number;                  // default 10

  // Repeat schedule (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
  // Empty array [] indicates a "One-off" alarm that turns off after ringing.
  repeatDays: number[];
  isOneOff?: boolean;

  // Generated timestamps for display and tracking
  generatedSequence?: string[]; // e.g. ["06:15 AM", "06:20 AM", ..., "07:00 AM"]
  
  // State tracking
  dismissedForToday?: boolean;
  lastDismissedDate?: string; // 'YYYY-MM-DD'
  notificationIds?: string[];
  snoozedUntil?: number; // epoch ms
}

export interface ActiveRingingAlarm {
  alarm: AlarmItem;
  currentStepIndex?: number;
  totalSteps?: number;
  currentTimeString: string;
}
