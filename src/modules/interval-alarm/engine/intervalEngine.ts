import { AlarmItem } from '../types';

export interface IntervalStep {
  timeString: string;
  hour: number;
  minute: number;
  totalMinutesFromStart: number;
}

/**
 * Format 24h hour and minute into a clean 12h format (e.g. 06:30 AM)
 */
export function formatTime12h(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const paddedMinute = minute.toString().padStart(2, '0');
  const paddedHour = displayHour.toString().padStart(2, '0');
  return `${paddedHour}:${paddedMinute} ${period}`;
}

/**
 * Calculates the next full hour from a given date (default: now).
 * e.g. 11:10 AM -> 12:00 PM (hour: 12, minute: 0)
 * e.g. 11:59 PM -> 12:00 AM (hour: 0, minute: 0)
 */
export function getNextHourTime(fromDate: Date = new Date()): { hour: number; minute: number } {
  const nextHour = (fromDate.getHours() + 1) % 24;
  return { hour: nextHour, minute: 0 };
}

/**
 * Generates all interval time steps between Start Time and End Time.
 * Handles midnight rollover (e.g. 23:45 to 00:30).
 */
export function generateIntervalSequence(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  intervalMinutes: number
): IntervalStep[] {
  const safeInterval = Math.max(1, Math.min(120, intervalMinutes || 10));
  const startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;

  // If end is before or equal to start, it crosses midnight
  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  const steps: IntervalStep[] = [];
  let currentTotal = startTotal;

  while (currentTotal <= endTotal) {
    const normalizedMinutes = currentTotal % (24 * 60);
    const hour = Math.floor(normalizedMinutes / 60);
    const minute = normalizedMinutes % 60;

    steps.push({
      timeString: formatTime12h(hour, minute),
      hour,
      minute,
      totalMinutesFromStart: currentTotal - startTotal,
    });

    currentTotal += safeInterval;
  }

  // Ensure at least the start step is present
  if (steps.length === 0) {
    steps.push({
      timeString: formatTime12h(startHour, startMinute),
      hour: startHour,
      minute: startMinute,
      totalMinutesFromStart: 0,
    });
  }

  return steps;
}

/**
 * Generates interval time steps for an Offset Alarm:
 * e.g. Target 07:00 AM, Before, 10 alarms, 5m interval
 * Steps: 06:15, 06:20, 06:25 ... 07:00 AM (10 steps)
 */
export function generateOffsetSequence(
  targetHour: number,
  targetMinute: number,
  direction: 'before' | 'after' = 'before',
  count: number = 10,
  intervalMinutes: number = 5
): IntervalStep[] {
  const safeCount = Math.max(1, Math.min(30, count || 10));
  const safeInterval = Math.max(1, Math.min(60, intervalMinutes || 5));
  const targetTotal = targetHour * 60 + targetMinute;

  const steps: IntervalStep[] = [];

  if (direction === 'before') {
    // Alarms count down towards target time
    const startTotal = targetTotal - (safeCount - 1) * safeInterval;
    for (let i = 0; i < safeCount; i++) {
      let stepTotal = startTotal + i * safeInterval;
      // Handle negative wrap (e.g. crossing midnight backwards)
      while (stepTotal < 0) {
        stepTotal += 24 * 60;
      }
      const normalizedMinutes = stepTotal % (24 * 60);
      const hour = Math.floor(normalizedMinutes / 60);
      const minute = normalizedMinutes % 60;
      steps.push({
        timeString: formatTime12h(hour, minute),
        hour,
        minute,
        totalMinutesFromStart: i * safeInterval,
      });
    }
  } else {
    // Alarms start at target time and continue after
    for (let i = 0; i < safeCount; i++) {
      let stepTotal = targetTotal + i * safeInterval;
      const normalizedMinutes = stepTotal % (24 * 60);
      const hour = Math.floor(normalizedMinutes / 60);
      const minute = normalizedMinutes % 60;
      steps.push({
        timeString: formatTime12h(hour, minute),
        hour,
        minute,
        totalMinutesFromStart: i * safeInterval,
      });
    }
  }

  return steps;
}

/**
 * Returns formatted time display string for any AlarmItem (single, interval, offset)
 */
export function formatAlarmTimeDisplay(alarm: AlarmItem): string {
  if (alarm.type === 'single') {
    return formatTime12h(alarm.startHour, alarm.startMinute);
  }

  if (alarm.type === 'interval') {
    const endH = alarm.endHour ?? alarm.startHour;
    const endM = alarm.endMinute ?? alarm.startMinute;
    return `${formatTime12h(alarm.startHour, alarm.startMinute)} – ${formatTime12h(endH, endM)}`;
  }

  if (alarm.type === 'offset') {
    const seq = generateOffsetSequence(
      alarm.startHour,
      alarm.startMinute,
      alarm.offsetDirection || 'before',
      alarm.alarmCount || 10,
      alarm.intervalMinutes || 5
    );
    if (seq.length > 0) {
      const first = seq[0].timeString;
      const last = seq[seq.length - 1].timeString;
      return `${first} – ${last}`;
    }
    return formatTime12h(alarm.startHour, alarm.startMinute);
  }

  return formatTime12h(alarm.startHour, alarm.startMinute);
}

/**
 * Smart schedule formatter for alarm cards:
 * "Today", "Tomorrow", "Every day", "Sun–Thu", "Mon–Fri", "Weekends", etc.
 */
export function getSmartScheduleString(alarm: AlarmItem, referenceDate: Date = new Date()): string {
  // If one-off / no repeat
  if (!alarm.repeatDays || alarm.repeatDays.length === 0) {
    const curHour = referenceDate.getHours();
    const curMin = referenceDate.getMinutes();

    let triggerHour = alarm.startHour;
    let triggerMinute = alarm.startMinute;

    // For offset alarms with 'before', earliest trigger is the first step
    if (alarm.type === 'offset' && alarm.offsetDirection === 'before') {
      const seq = generateOffsetSequence(
        alarm.startHour,
        alarm.startMinute,
        'before',
        alarm.alarmCount || 10,
        alarm.intervalMinutes || 5
      );
      if (seq.length > 0) {
        triggerHour = seq[0].hour;
        triggerMinute = seq[0].minute;
      }
    }

    const alarmMins = triggerHour * 60 + triggerMinute;
    const nowMins = curHour * 60 + curMin;

    return alarmMins > nowMins ? 'Today' : 'Tomorrow';
  }

  const days = alarm.repeatDays.slice().sort((a, b) => a - b);

  if (days.length === 7) {
    return 'Every day';
  }

  // Weekdays (Mon-Fri) [1, 2, 3, 4, 5]
  if (days.length === 5 && days.join(',') === '1,2,3,4,5') {
    return 'Mon–Fri';
  }

  // Sun-Thu [0, 1, 2, 3, 4]
  if (days.length === 5 && days.join(',') === '0,1,2,3,4') {
    return 'Sun–Thu';
  }

  // Weekends [0, 6]
  if (days.length === 2 && days.join(',') === '0,6') {
    return 'Weekends';
  }

  // Fri-Sat [5, 6]
  if (days.length === 2 && days.join(',') === '5,6') {
    return 'Fri–Sat';
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Check if consecutive range e.g. Mon-Thu (1,2,3,4)
  let isConsecutive = true;
  for (let i = 1; i < days.length; i++) {
    if (days[i] !== days[i - 1] + 1) {
      isConsecutive = false;
      break;
    }
  }

  if (isConsecutive && days.length >= 3) {
    return `${dayNames[days[0]]}–${dayNames[days[days.length - 1]]}`;
  }

  // Fallback to joined day initials/names
  return days.map((d) => dayNames[d]).join(', ');
}

/**
 * Calculates the exact next Date when an alarm will trigger.
 */
export function calculateNextOccurrence(alarm: AlarmItem, referenceDate: Date = new Date()): Date {
  const now = referenceDate;
  const currentDayOfWeek = now.getDay(); // 0 = Sun ... 6 = Sat
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentSeconds = now.getSeconds();

  let effectiveHour = alarm.startHour;
  let effectiveMinute = alarm.startMinute;

  // If offset before, trigger begins at the earliest step
  if (alarm.type === 'offset' && alarm.offsetDirection === 'before') {
    const seq = generateOffsetSequence(
      alarm.startHour,
      alarm.startMinute,
      'before',
      alarm.alarmCount || 10,
      alarm.intervalMinutes || 5
    );
    if (seq.length > 0) {
      effectiveHour = seq[0].hour;
      effectiveMinute = seq[0].minute;
    }
  }

  const isTodayDismissed =
    alarm.dismissedForToday &&
    alarm.lastDismissedDate === now.toISOString().slice(0, 10);

  // If alarm is One-Off (empty repeatDays)
  if (!alarm.repeatDays || alarm.repeatDays.length === 0) {
    const target = new Date(now);
    target.setHours(effectiveHour, effectiveMinute, 0, 0);

    const isPastToday =
      currentHour > effectiveHour ||
      (currentHour === effectiveHour && currentMinute >= effectiveMinute && currentSeconds >= 1);

    if (isPastToday || isTodayDismissed) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  // If alarm repeats on specific days
  for (let offset = 0; offset <= 7; offset++) {
    const candidateDay = (currentDayOfWeek + offset) % 7;
    if (alarm.repeatDays.includes(candidateDay)) {
      const target = new Date(now);
      target.setDate(target.getDate() + offset);
      target.setHours(effectiveHour, effectiveMinute, 0, 0);

      const candidateDateStr = target.toISOString().slice(0, 10);
      const isCandidateDismissed =
        alarm.dismissedForToday && alarm.lastDismissedDate === candidateDateStr;

      if (offset === 0) {
        const isPastToday =
          currentHour > effectiveHour ||
          (currentHour === effectiveHour && currentMinute >= effectiveMinute);

        if (!isPastToday && !isCandidateDismissed) {
          return target;
        }
      } else {
        if (!isCandidateDismissed) {
          return target;
        }
      }
    }
  }

  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(effectiveHour, effectiveMinute, 0, 0);
  return fallback;
}

/**
 * Returns Google Clock style countdown string:
 * "Alarm rings in 7 hours 25 minutes", "Alarm rings in 15 minutes", etc.
 */
export function getGoogleCountdownText(targetDate: Date, referenceDate: Date = new Date()): string {
  const diffMs = targetDate.getTime() - referenceDate.getTime();

  if (diffMs <= 0) {
    return 'Ringing now';
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    const dayStr = days === 1 ? '1 day' : `${days} days`;
    const hourStr = hours === 1 ? '1 hr' : `${hours} hrs`;
    return `Rings in ${dayStr}, ${hourStr}`;
  }

  if (hours > 0) {
    const hourStr = hours === 1 ? '1 hour' : `${hours} hours`;
    if (minutes === 0) {
      return `Rings in ${hourStr}`;
    }
    const minStr = minutes === 1 ? '1 min' : `${minutes} mins`;
    return `Rings in ${hourStr} ${minStr}`;
  }

  if (minutes > 0) {
    return `Rings in ${minutes === 1 ? '1 minute' : `${minutes} minutes`}`;
  }

  return 'Rings in less than a minute';
}

/**
 * Returns user-facing toast text confirming how long until the alarm rings:
 * e.g. "Alarm set for 8 hours and 30 minutes from now"
 * Directly allows the user to catch AM vs PM mistakes.
 */
export function getAlarmSetDurationToastText(targetDate: Date, referenceDate: Date = new Date()): string {
  const diffMs = targetDate.getTime() - referenceDate.getTime();
  if (diffMs <= 0) {
    return 'Alarm set for less than a minute from now';
  }

  const totalMinutes = Math.round(diffMs / (1000 * 60));
  if (totalMinutes <= 0) {
    return 'Alarm set for less than a minute from now';
  }

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(days === 1 ? '1 day' : `${days} days`);
  }
  if (hours > 0) {
    parts.push(hours === 1 ? '1 hour' : `${hours} hours`);
  }
  if (minutes > 0) {
    parts.push(minutes === 1 ? '1 minute' : `${minutes} minutes`);
  }

  if (parts.length === 0) {
    return 'Alarm set for less than a minute from now';
  }

  let durationStr = '';
  if (parts.length === 1) {
    durationStr = parts[0];
  } else if (parts.length === 2) {
    durationStr = `${parts[0]} and ${parts[1]}`;
  } else {
    durationStr = `${parts[0]}, ${parts[1]} and ${parts[2]}`;
  }

  return `Alarm set for ${durationStr} from now`;
}

/**
 * Calculates the exact toast message from an alarm object definition.
 */
export function getAlarmToastMessage(
  alarm: Partial<AlarmItem> & { startHour: number; startMinute: number },
  referenceDate: Date = new Date()
): string {
  const fullAlarm: AlarmItem = {
    id: alarm.id || 'temp',
    type: alarm.type || 'single',
    startHour: alarm.startHour,
    startMinute: alarm.startMinute,
    endHour: alarm.endHour,
    endMinute: alarm.endMinute,
    offsetDirection: alarm.offsetDirection,
    alarmCount: alarm.alarmCount,
    intervalMinutes: alarm.intervalMinutes,
    repeatDays: alarm.repeatDays || [],
    label: alarm.label || '',
    isEnabled: true,
    dismissedForToday: false,
  };
  const targetDate = calculateNextOccurrence(fullAlarm, referenceDate);
  return getAlarmSetDurationToastText(targetDate, referenceDate);
}

/**
 * Finds the earliest upcoming active alarm among all saved alarms.
 */
export function findNextUpcomingAlarm(
  alarms: AlarmItem[],
  referenceDate: Date = new Date()
): { nextAlarm: AlarmItem; nextDate: Date; countdownText: string } | null {
  const enabledAlarms = alarms.filter((a) => a.isEnabled);
  if (enabledAlarms.length === 0) {
    return null;
  }

  let earliest: { nextAlarm: AlarmItem; nextDate: Date } | null = null;

  for (const alarm of enabledAlarms) {
    const nextDate = calculateNextOccurrence(alarm, referenceDate);
    if (!earliest || nextDate.getTime() < earliest.nextDate.getTime()) {
      earliest = { nextAlarm: alarm, nextDate };
    }
  }

  if (!earliest) return null;

  return {
    nextAlarm: earliest.nextAlarm,
    nextDate: earliest.nextDate,
    countdownText: getGoogleCountdownText(earliest.nextDate, referenceDate),
  };
}

/**
 * Formats repeat days into readable summary
 */
export function formatRepeatDays(repeatDays: number[]): string {
  if (!repeatDays || repeatDays.length === 0) {
    return 'One-off';
  }
  if (repeatDays.length === 7) {
    return 'Every day';
  }
  if (
    repeatDays.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => repeatDays.includes(d))
  ) {
    return 'Weekdays (Mon–Fri)';
  }
  if (
    repeatDays.length === 5 &&
    [0, 1, 2, 3, 4].every((d) => repeatDays.includes(d))
  ) {
    return 'Sun–Thu';
  }
  if (
    repeatDays.length === 2 &&
    [0, 6].every((d) => repeatDays.includes(d))
  ) {
    return 'Weekends (Sat–Sun)';
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return repeatDays
    .slice()
    .sort((a, b) => a - b)
    .map((d) => dayNames[d])
    .join(', ');
}
