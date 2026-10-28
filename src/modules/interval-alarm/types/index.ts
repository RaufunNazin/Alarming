export type AlarmType = 'single' | 'interval' | 'offset';

export interface CustomAlarmStep {
  hour: number;       // 0-23
  minute: number;     // 0-59
  isEnabled: boolean; // whether this specific alarm timing is enabled
}

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
  isEscalating?: boolean;               // true when using Escalating Interval mode

  // Repeat schedule (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
  // Empty array [] indicates a "One-off" alarm that turns off after ringing.
  repeatDays: number[];
  isOneOff?: boolean;

  // Organization & Day-off Skip
  category?: string;
  skipNextDate?: string; // 'YYYY-MM-DD' local cycle date to skip
  pausedUntil?: number;  // epoch ms until which this alarm is paused (e.g. 24h category pause)

  // Generated timestamps for display and tracking
  generatedSequence?: string[]; // e.g. ["06:15 AM", "06:20 AM", ..., "07:00 AM"]
  customSteps?: CustomAlarmStep[];
  
  // State tracking
  enabledAt?: number; // epoch ms when created/enabled/updated
  dismissedForToday?: boolean;
  lastDismissedDate?: string; // 'YYYY-MM-DD'
  notificationIds?: string[];
  snoozedUntil?: number; // epoch ms
}

export interface ActivePowerNap {
  endsAt: number; // epoch ms
  durationMinutes: number;
  notificationId?: string;
}

export interface ActiveRingingAlarm {
  alarm: AlarmItem;
  currentStepIndex?: number;
  totalSteps?: number;
  currentTimeString: string;
}
