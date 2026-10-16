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
 * Calculates the exact next Date when an alarm will trigger.
 */
export function calculateNextOccurrence(alarm: AlarmItem, referenceDate: Date = new Date()): Date {
  const now = referenceDate;
  const currentDayOfWeek = now.getDay(); // 0 = Sun ... 6 = Sat
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentSeconds = now.getSeconds();

  const isTodayDismissed =
    alarm.dismissedForToday &&
    alarm.lastDismissedDate === now.toISOString().slice(0, 10);

  // If alarm is One-Off (empty repeatDays)
  if (!alarm.repeatDays || alarm.repeatDays.length === 0) {
    const target = new Date(now);
    target.setHours(alarm.startHour, alarm.startMinute, 0, 0);

    const isPastToday =
      currentHour > alarm.startHour ||
      (currentHour === alarm.startHour && currentMinute >= alarm.startMinute && currentSeconds >= 1);

    if (isPastToday || isTodayDismissed) {
      // Advance to tomorrow
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
      target.setHours(alarm.startHour, alarm.startMinute, 0, 0);

      const candidateDateStr = target.toISOString().slice(0, 10);
      const isCandidateDismissed =
        alarm.dismissedForToday && alarm.lastDismissedDate === candidateDateStr;

      if (offset === 0) {
        const isPastToday =
          currentHour > alarm.startHour ||
          (currentHour === alarm.startHour && currentMinute >= alarm.startMinute);

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

  // Default fallback: 1 week ahead
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(alarm.startHour, alarm.startMinute, 0, 0);
  return fallback;
}

/**
 * Returns Google Clock style countdown string:
 * "Alarm rings in 7 hours 25 minutes", "Alarm rings in 15 minutes", etc.
 */
export function getGoogleCountdownText(targetDate: Date, referenceDate: Date = new Date()): string {
  const diffMs = targetDate.getTime() - referenceDate.getTime();

  if (diffMs <= 0) {
    return 'Alarm ringing now';
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    const dayStr = days === 1 ? '1 day' : `${days} days`;
    const hourStr = hours === 1 ? '1 hour' : `${hours} hours`;
    return `Alarm rings in ${dayStr}, ${hourStr}`;
  }

  if (hours > 0) {
    const hourStr = hours === 1 ? '1 hour' : `${hours} hours`;
    if (minutes === 0) {
      return `Alarm rings in ${hourStr}`;
    }
    const minStr = minutes === 1 ? '1 minute' : `${minutes} minutes`;
    return `Alarm rings in ${hourStr} ${minStr}`;
  }

  if (minutes > 0) {
    return `Alarm rings in ${minutes === 1 ? '1 minute' : `${minutes} minutes`}`;
  }

  return 'Alarm rings in less than a minute';
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
 * Formats repeat days into readable summary (e.g. "Mon, Tue, Wed, Thu, Fri", "Every day", "One-off")
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
