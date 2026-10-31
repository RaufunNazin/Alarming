import { AlarmItem, CustomAlarmStep } from '../types';
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { formatNumberLocalized, formatTime12hLocalized } from '../../../core/i18n/translations';

export interface IntervalStep {
  timeString: string;
  hour: number;
  minute: number;
  totalMinutesFromStart: number;
}

export interface ScheduledAlarmStep {
  stepIndex: number;
  totalSteps: number;
  timeString: string;
  hour: number;
  minute: number;
  date: Date;
  cycleDateStr: string;
}

/**
 * Formats a Date as a local YYYY-MM-DD key so local midnight transitions
 * are not skewed by UTC offsets.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isCycleDismissedForDate(alarm: AlarmItem, cycleBaseDate: Date): boolean {
  if (!alarm.dismissedForToday || !alarm.lastDismissedDate) {
    return false;
  }
  const localStr = getLocalDateString(cycleBaseDate);
  const utcStr = cycleBaseDate.toISOString().slice(0, 10);
  return alarm.lastDismissedDate === localStr || alarm.lastDismissedDate === utcStr;
}

export function isCycleSkippedForDate(alarm: AlarmItem, cycleBaseDate: Date): boolean {
  if (!alarm.skipNextDate) {
    return false;
  }
  const localStr = getLocalDateString(cycleBaseDate);
  return alarm.skipNextDate === localStr;
}

/**
 * Formats a 'YYYY-MM-DD' date string into a concise human-readable label (e.g., "Mon, Oct 26").
 */
export function formatSkippedDateLabel(dateStr: string): string {
  const parts = dateStr.split('-').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const lang = useSettingsStore.getState().language;

  if (lang === 'bn') {
    const dayNames = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
    const monthNames = [
      'জানু',
      'ফেব্রু',
      'মার্চ',
      'এপ্রিল',
      'মে',
      'জুন',
      'জুলাই',
      'আগস্ট',
      'সেপ্টে',
      'অক্টো',
      'নভে',
      'ডিসে',
    ];
    return `${dayNames[date.getDay()]}, ${formatNumberLocalized(date.getDate(), 'bn')} ${monthNames[date.getMonth()]}`;
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`;
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

  // Always guarantee the explicit End Time is included as the final step
  // if the window duration is not an exact multiple of safeInterval (or is shorter than safeInterval)
  const totalWindowMinutes = endTotal - startTotal;
  const lastStep = steps[steps.length - 1];
  if (totalWindowMinutes > 0 && lastStep.totalMinutesFromStart < totalWindowMinutes) {
    const endNormalized = endTotal % (24 * 60);
    const endH = Math.floor(endNormalized / 60);
    const endM = endNormalized % 60;
    steps.push({
      timeString: formatTime12h(endH, endM),
      hour: endH,
      minute: endM,
      totalMinutesFromStart: totalWindowMinutes,
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
  intervalMinutes: number = 10
): IntervalStep[] {
  const safeCount = Math.max(1, Math.min(30, count || 10));
  const safeInterval = Math.max(1, Math.min(60, intervalMinutes || 10));
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
 * Generates an automatic escalating interval sequence across a Start -> End window.
 * Intervals progressively shrink as End Time approaches (e.g., 20m -> 15m -> 10m -> 5m -> 3m -> 2m -> 1m).
 */
export function generateEscalatingIntervalSequence(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
): IntervalStep[] {
  const startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  const totalWindow = endTotal - startTotal;
  if (totalWindow <= 1) {
    const startNorm = startTotal % (24 * 60);
    const endNorm = endTotal % (24 * 60);
    const result: IntervalStep[] = [
      {
        timeString: formatTime12h(Math.floor(startNorm / 60), startNorm % 60),
        hour: Math.floor(startNorm / 60),
        minute: startNorm % 60,
        totalMinutesFromStart: 0,
      },
    ];
    if (totalWindow === 1) {
      result.push({
        timeString: formatTime12h(Math.floor(endNorm / 60), endNorm % 60),
        hour: Math.floor(endNorm / 60),
        minute: endNorm % 60,
        totalMinutesFromStart: 1,
      });
    }
    return result;
  }

  const reverseGaps = [1, 2, 3, 5, 10, 15, 20, 25, 30, 30, 30, 30];
  const minutePoints: number[] = [endTotal];
  let cursor = endTotal;

  for (const gap of reverseGaps) {
    const candidate = cursor - gap;
    const remainingToStart = candidate - startTotal;
    if (remainingToStart >= gap) {
      minutePoints.push(candidate);
      cursor = candidate;
    } else {
      break;
    }
  }

  if (minutePoints[minutePoints.length - 1] !== startTotal) {
    minutePoints.push(startTotal);
  }

  minutePoints.reverse();

  return minutePoints.map((absMin) => {
    const normalizedMinutes = absMin % (24 * 60);
    const hour = Math.floor(normalizedMinutes / 60);
    const minute = normalizedMinutes % 60;
    return {
      timeString: formatTime12h(hour, minute),
      hour,
      minute,
      totalMinutesFromStart: absMin - startTotal,
    };
  });
}

/**
 * Generates an automatic escalating sequence for a Before/After Offset alarm.
 * Uses smart tightening gaps: [15, 10, 5, 3, 2, 1] minutes (7 steps across 36 minutes).
 */
export function generateEscalatingOffsetSequence(
  targetHour: number,
  targetMinute: number,
  direction: 'before' | 'after' = 'before'
): IntervalStep[] {
  const gaps = [15, 10, 5, 3, 2, 1];
  const totalSpan = gaps.reduce((acc, g) => acc + g, 0); // 36 minutes
  const targetTotal = targetHour * 60 + targetMinute;

  const offsetsFromFirst: number[] = [0];
  let running = 0;
  for (const g of gaps) {
    running += g;
    offsetsFromFirst.push(running);
  }

  const firstStepTotal = direction === 'before' ? targetTotal - totalSpan : targetTotal;

  return offsetsFromFirst.map((offsetMin) => {
    let stepTotal = firstStepTotal + offsetMin;
    while (stepTotal < 0) {
      stepTotal += 24 * 60;
    }
    const normalizedMinutes = stepTotal % (24 * 60);
    const hour = Math.floor(normalizedMinutes / 60);
    const minute = normalizedMinutes % 60;
    return {
      timeString: formatTime12h(hour, minute),
      hour,
      minute,
      totalMinutesFromStart: offsetMin,
    };
  });
}

/**
 * Returns the base (unmodified) sequence of IntervalStep objects for any alarm type ('single' | 'interval' | 'offset').
 */
export function getBaseAlarmSteps(
  alarm: Pick<
    AlarmItem,
    | 'type'
    | 'startHour'
    | 'startMinute'
    | 'endHour'
    | 'endMinute'
    | 'intervalMinutes'
    | 'offsetDirection'
    | 'alarmCount'
    | 'isEscalating'
  >
): IntervalStep[] {
  if (alarm.type === 'interval') {
    if (alarm.isEscalating) {
      return generateEscalatingIntervalSequence(
        alarm.startHour,
        alarm.startMinute,
        alarm.endHour ?? alarm.startHour,
        alarm.endMinute ?? alarm.startMinute
      );
    }
    return generateIntervalSequence(
      alarm.startHour,
      alarm.startMinute,
      alarm.endHour ?? alarm.startHour,
      alarm.endMinute ?? alarm.startMinute,
      alarm.intervalMinutes ?? 10
    );
  }

  if (alarm.type === 'offset') {
    if (alarm.isEscalating) {
      return generateEscalatingOffsetSequence(
        alarm.startHour,
        alarm.startMinute,
        alarm.offsetDirection || 'before'
      );
    }
    return generateOffsetSequence(
      alarm.startHour,
      alarm.startMinute,
      alarm.offsetDirection || 'before',
      alarm.alarmCount || 10,
      alarm.intervalMinutes || 10
    );
  }

  return [
    {
      timeString: formatTime12h(alarm.startHour, alarm.startMinute),
      hour: alarm.startHour,
      minute: alarm.startMinute,
      totalMinutesFromStart: 0,
    },
  ];
}

/**
 * Sorts custom steps chronologically within a single cycle window without jumping +24h
 * when a step is nudged past its neighbor. Handles genuine overnight windows (>12h wrap).
 */
export function sortCustomStepsChronologically(steps: CustomAlarmStep[]): CustomAlarmStep[] {
  if (steps.length <= 1) return steps;
  const anchorMin = steps[0].hour * 60 + steps[0].minute;

  const withOffset = steps.map((step, originalIdx) => {
    const rawMin = step.hour * 60 + step.minute;
    let delta = rawMin - anchorMin;
    // If a step is more than 12 hours earlier than the anchor (e.g. anchor 23:30, step 00:15),
    // treat it as crossing midnight (+24h); if it's slightly earlier (e.g. nudged -5m before step 0),
    // keep its negative delta so it sorts to the front instead of wrapping +24h into tomorrow.
    if (delta < -720) {
      delta += 1440;
    } else if (delta > 720) {
      delta -= 1440;
    }
    return { step, delta, originalIdx };
  });

  withOffset.sort((a, b) => (a.delta !== b.delta ? a.delta - b.delta : a.originalIdx - b.originalIdx));
  return withOffset.map((item) => item.step);
}

/**
 * Returns the active sequence of IntervalStep objects for any alarm type ('single' | 'interval' | 'offset'),
 * respecting per-step `customSteps` overrides (individual timing adjustments and on/off states).
 */
export function getAlarmSteps(
  alarm: Pick<
    AlarmItem,
    | 'type'
    | 'startHour'
    | 'startMinute'
    | 'endHour'
    | 'endMinute'
    | 'intervalMinutes'
    | 'offsetDirection'
    | 'alarmCount'
    | 'isEscalating'
    | 'customSteps'
  >
): IntervalStep[] {
  if (alarm.customSteps && alarm.customSteps.length > 0) {
    const enabledSteps = alarm.customSteps.filter((s) => s.isEnabled);
    const rawSource = enabledSteps.length > 0 ? enabledSteps : [alarm.customSteps[0]];
    const sourceSteps = sortCustomStepsChronologically(rawSource);
    const firstTotal = sourceSteps[0].hour * 60 + sourceSteps[0].minute;
    let prevAbsolute = firstTotal;

    return sourceSteps.map((step, index) => {
      if (index === 0) {
        return {
          timeString: formatTime12h(step.hour, step.minute),
          hour: step.hour,
          minute: step.minute,
          totalMinutesFromStart: 0,
        };
      }
      let currentAbsolute = step.hour * 60 + step.minute;
      if (currentAbsolute < firstTotal - 720) {
        currentAbsolute += 24 * 60;
      }
      if (currentAbsolute < prevAbsolute) {
        currentAbsolute = prevAbsolute;
      }
      prevAbsolute = currentAbsolute;
      return {
        timeString: formatTime12h(step.hour, step.minute),
        hour: step.hour,
        minute: step.minute,
        totalMinutesFromStart: currentAbsolute - firstTotal,
      };
    });
  }

  return getBaseAlarmSteps(alarm);
}

/**
 * Returns formatted time display string for any AlarmItem (single, interval, offset)
 */
export function formatAlarmTimeDisplay(alarm: AlarmItem): string {
  const lang = useSettingsStore.getState().language;
  const steps = getAlarmSteps(alarm);
  if (steps.length > 1) {
    const first = formatTime12hLocalized(steps[0].hour, steps[0].minute, lang).full;
    const last = formatTime12hLocalized(
      steps[steps.length - 1].hour,
      steps[steps.length - 1].minute,
      lang
    ).full;
    return `${first} – ${last}`;
  }
  if (steps.length === 1) {
    return formatTime12hLocalized(steps[0].hour, steps[0].minute, lang).full;
  }
  return formatTime12hLocalized(alarm.startHour, alarm.startMinute, lang).full;
}

/**
 * Resolves the upcoming scheduled steps for the active or next occurrence cycle of an alarm.
 * Properly preserves remaining steps of an in-progress Window or Offset cycle today
 * (or an overnight window that started before midnight) instead of skipping to tomorrow.
 */
export function getUpcomingAlarmStepDates(
  alarm: AlarmItem,
  referenceDate: Date = new Date(),
  ignoreSkipNext: boolean = false
): ScheduledAlarmStep[] {
  const now = referenceDate;
  const nowMs = now.getTime();
  const steps = getAlarmSteps(alarm);
  const firstStep = steps[0];
  const lastStep = steps[steps.length - 1];
  const isMultiStep = lastStep.totalMinutesFromStart > 0;
  const hasRepeatDays = Boolean(alarm.repeatDays && alarm.repeatDays.length > 0);

  // Check dayOffset = -1 (yesterday's overnight cycle spilling into today),
  // dayOffset = 0 (today), and dayOffset = 1..14 (upcoming days, extended so skipping still finds next cycle).
  for (let dayOffset = -1; dayOffset <= 14; dayOffset++) {
    if (dayOffset === -1 && !isMultiStep) {
      continue;
    }

    const cycleBaseDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      firstStep.hour,
      firstStep.minute,
      0,
      0
    );

    // An overnight cycle from yesterday only applies if the alarm was already enabled
    // before or during that cycle's start (prevents a newly created alarm after midnight
    // from thinking it started yesterday).
    if (
      dayOffset === -1 &&
      alarm.enabledAt &&
      cycleBaseDate.getTime() < alarm.enabledAt - 60 * 1000
    ) {
      continue;
    }

    if (hasRepeatDays) {
      const candidateDay = cycleBaseDate.getDay();
      if (!alarm.repeatDays.includes(candidateDay)) {
        continue;
      }
    }

    if (isCycleDismissedForDate(alarm, cycleBaseDate)) {
      continue;
    }

    if (!ignoreSkipNext && isCycleSkippedForDate(alarm, cycleBaseDate)) {
      continue;
    }

    const cycleDateStr = getLocalDateString(cycleBaseDate);
    const upcomingSteps: ScheduledAlarmStep[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepDate = new Date(
        cycleBaseDate.getTime() + step.totalMinutesFromStart * 60 * 1000
      );

      if (stepDate.getTime() > nowMs) {
        if (
          !ignoreSkipNext &&
          alarm.pausedUntil &&
          stepDate.getTime() < alarm.pausedUntil
        ) {
          continue;
        }
        upcomingSteps.push({
          stepIndex: i,
          totalSteps: steps.length,
          timeString: step.timeString,
          hour: step.hour,
          minute: step.minute,
          date: stepDate,
          cycleDateStr,
        });
      }
    }

    if (upcomingSteps.length > 0) {
      return upcomingSteps;
    }
  }

  // Fallback to tomorrow (or the day after pausedUntil) if all candidate days were skipped
  const fallbackRef =
    !ignoreSkipNext && alarm.pausedUntil && alarm.pausedUntil > nowMs
      ? new Date(alarm.pausedUntil)
      : now;
  const fallbackBase = new Date(
    fallbackRef.getFullYear(),
    fallbackRef.getMonth(),
    fallbackRef.getDate() + 1,
    firstStep.hour,
    firstStep.minute,
    0,
    0
  );
  const fallbackDateStr = getLocalDateString(fallbackBase);
  return steps.map((step, i) => ({
    stepIndex: i,
    totalSteps: steps.length,
    timeString: step.timeString,
    hour: step.hour,
    minute: step.minute,
    date: new Date(fallbackBase.getTime() + step.totalMinutesFromStart * 60 * 1000),
    cycleDateStr: fallbackDateStr,
  }));
}

/**
 * Finds the step (if any) that is due to ring during the current minute of `now`.
 * Respects `enabledAt`, `dismissedForToday`, `repeatDays`, and overnight sequences.
 */
export function findDueAlarmStepAtTime(
  alarm: AlarmItem,
  now: Date = new Date()
): ScheduledAlarmStep | null {
  if (!alarm.isEnabled) return null;
  if (alarm.pausedUntil && now.getTime() < alarm.pausedUntil) return null;

  const steps = getAlarmSteps(alarm);
  const firstStep = steps[0];
  const lastStep = steps[steps.length - 1];
  const isMultiStep = lastStep.totalMinutesFromStart > 0;
  const hasRepeatDays = Boolean(alarm.repeatDays && alarm.repeatDays.length > 0);

  const currentMinuteStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    0,
    0
  ).getTime();

  for (let dayOffset = -1; dayOffset <= 0; dayOffset++) {
    if (dayOffset === -1 && !isMultiStep) {
      continue;
    }

    const cycleBaseDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      firstStep.hour,
      firstStep.minute,
      0,
      0
    );

    if (
      dayOffset === -1 &&
      alarm.enabledAt &&
      cycleBaseDate.getTime() < alarm.enabledAt - 60 * 1000
    ) {
      continue;
    }

    if (hasRepeatDays && !alarm.repeatDays.includes(cycleBaseDate.getDay())) {
      continue;
    }

    if (isCycleDismissedForDate(alarm, cycleBaseDate)) {
      continue;
    }

    if (isCycleSkippedForDate(alarm, cycleBaseDate)) {
      continue;
    }

    const cycleDateStr = getLocalDateString(cycleBaseDate);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepTimeMs =
        cycleBaseDate.getTime() + step.totalMinutesFromStart * 60 * 1000;

      if (stepTimeMs === currentMinuteStart) {
        // If the alarm was just created/enabled/updated AFTER this minute's :00 mark already passed,
        // do not falsely trigger this past minute immediately upon save.
        if (alarm.enabledAt && alarm.enabledAt > stepTimeMs + 1000) {
          continue;
        }

        return {
          stepIndex: i,
          totalSteps: steps.length,
          timeString: step.timeString,
          hour: step.hour,
          minute: step.minute,
          date: new Date(stepTimeMs),
          cycleDateStr,
        };
      }
    }
  }

  return null;
}

/**
 * Smart schedule formatter for alarm cards:
 * "Today", "Tomorrow", "Every day", "Sun–Thu", "Mon–Fri", "Weekends", etc.
 */
export function getSmartScheduleString(alarm: AlarmItem, referenceDate: Date = new Date()): string {
  const lang = useSettingsStore.getState().language;

  // If one-off / no repeat
  if (!alarm.repeatDays || alarm.repeatDays.length === 0) {
    const nextDate = calculateNextOccurrence(alarm, referenceDate);
    const isToday = getLocalDateString(nextDate) === getLocalDateString(referenceDate);
    if (lang === 'bn') {
      return isToday ? 'আজ' : 'আগামীকাল';
    }
    return isToday ? 'Today' : 'Tomorrow';
  }

  const days = alarm.repeatDays.slice().sort((a, b) => a - b);

  if (days.length === 7) {
    return lang === 'bn' ? 'প্রতিদিন' : 'Every day';
  }

  // Weekdays (Mon-Fri) [1, 2, 3, 4, 5]
  if (days.length === 5 && days.join(',') === '1,2,3,4,5') {
    return lang === 'bn' ? 'সোম–শুক্র' : 'Mon–Fri';
  }

  // Sun-Thu [0, 1, 2, 3, 4]
  if (days.length === 5 && days.join(',') === '0,1,2,3,4') {
    return lang === 'bn' ? 'রবি–বৃহঃ' : 'Sun–Thu';
  }

  // Weekends [0, 6]
  if (days.length === 2 && days.join(',') === '0,6') {
    return lang === 'bn' ? 'ছুটির দিন' : 'Weekends';
  }

  // Fri-Sat [5, 6]
  if (days.length === 2 && days.join(',') === '5,6') {
    return lang === 'bn' ? 'শুক্র–শনি' : 'Fri–Sat';
  }

  const dayNames =
    lang === 'bn'
      ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const upcomingSteps = getUpcomingAlarmStepDates(alarm, referenceDate);
  if (upcomingSteps.length > 0 && upcomingSteps[0]?.date) {
    return upcomingSteps[0].date;
  }
  const unskippedSteps = getUpcomingAlarmStepDates(alarm, referenceDate, true);
  if (unskippedSteps.length > 0 && unskippedSteps[0]?.date) {
    return unskippedSteps[0].date;
  }
  const fallback = new Date(referenceDate);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(
    Number.isFinite(alarm.startHour) ? alarm.startHour : 7,
    Number.isFinite(alarm.startMinute) ? alarm.startMinute : 0,
    0,
    0
  );
  return fallback;
}

/**
 * Returns Google Clock style countdown string:
 * "Alarm rings in 7 hours 25 minutes", "Alarm rings in 15 minutes", etc.
 */
export function getGoogleCountdownText(targetDate: Date, referenceDate: Date = new Date()): string {
  const diffMs = targetDate.getTime() - referenceDate.getTime();
  const lang = useSettingsStore.getState().language;

  if (diffMs <= 0) {
    return lang === 'bn' ? 'এখন বাজছে' : 'Ringing now';
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (lang === 'bn') {
    if (days > 0) {
      const dStr = `${formatNumberLocalized(days, 'bn')} দিন`;
      const hStr = `${formatNumberLocalized(hours, 'bn')} ঘণ্টা`;
      return `আর ${dStr} ${hStr} পর বাজবে`;
    }
    if (hours > 0) {
      const hStr = `${formatNumberLocalized(hours, 'bn')} ঘণ্টা`;
      if (minutes === 0) return `আর ${hStr} পর বাজবে`;
      const mStr = `${formatNumberLocalized(minutes, 'bn')} মিনিট`;
      return `আর ${hStr} ${mStr} পর বাজবে`;
    }
    if (minutes > 0) {
      return `আর ${formatNumberLocalized(minutes, 'bn')} মিনিট পর বাজবে`;
    }
    return '১ মিনিটের মধ্যেই বাজবে';
  }

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
  const lang = useSettingsStore.getState().language;

  if (diffMs <= 0) {
    return lang === 'bn'
      ? 'আর ১ মিনিটের মধ্যেই অ্যালার্ম বাজবে'
      : 'Alarm set for less than a minute from now';
  }

  const totalMinutes = Math.round(diffMs / (1000 * 60));
  if (totalMinutes <= 0) {
    return lang === 'bn'
      ? 'আর ১ মিনিটের মধ্যেই অ্যালার্ম বাজবে'
      : 'Alarm set for less than a minute from now';
  }

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (lang === 'bn') {
    const parts: string[] = [];
    if (days > 0) parts.push(`${formatNumberLocalized(days, 'bn')} দিন`);
    if (hours > 0) parts.push(`${formatNumberLocalized(hours, 'bn')} ঘণ্টা`);
    if (minutes > 0) parts.push(`${formatNumberLocalized(minutes, 'bn')} মিনিট`);
    if (parts.length === 0) {
      return 'আর ১ মিনিটের মধ্যেই অ্যালার্ম বাজবে';
    }
    return `অ্যালার্ম সেট হয়েছে • আর ${parts.join(' ')} পর বাজবে`;
  }

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
    isEscalating: alarm.isEscalating,
    customSteps: alarm.customSteps,
    repeatDays: alarm.repeatDays || [],
    label: alarm.label || '',
    isEnabled: true,
    dismissedForToday: false,
  };
  const targetDate = calculateNextOccurrence(fullAlarm, referenceDate);
  return getAlarmSetDurationToastText(targetDate, referenceDate);
}

/**
 * Returns live dial time-to-ring badge text:
 * e.g., "Alarm rings in 7 hours 24 minutes"
 */
export function getLiveDialDurationText(
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
    isEscalating: alarm.isEscalating,
    customSteps: alarm.customSteps,
    repeatDays: alarm.repeatDays || [],
    label: alarm.label || '',
    isEnabled: true,
    dismissedForToday: false,
  };
  const targetDate = calculateNextOccurrence(fullAlarm, referenceDate);
  const diffMs = targetDate.getTime() - referenceDate.getTime();
  const lang = useSettingsStore.getState().language;

  if (diffMs <= 0) {
    return lang === 'bn' ? 'আর ১ মিনিটের মধ্যেই বাজবে' : 'Alarm rings in less than a minute';
  }

  const totalMinutes = Math.ceil(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (lang === 'bn') {
    const parts: string[] = [];
    if (days > 0) parts.push(`${formatNumberLocalized(days, 'bn')} দিন`);
    if (hours > 0) parts.push(`${formatNumberLocalized(hours, 'bn')} ঘণ্টা`);
    if (minutes > 0) parts.push(`${formatNumberLocalized(minutes, 'bn')} মিনিট`);
    if (parts.length === 0) return 'আর ১ মিনিটের মধ্যেই বাজবে';
    return `আর ${parts.join(' ')} পর বাজবে`;
  }

  const parts: string[] = [];
  if (days > 0) parts.push(days === 1 ? '1 day' : `${days} days`);
  if (hours > 0) parts.push(hours === 1 ? '1 hour' : `${hours} hours`);
  if (minutes > 0) parts.push(minutes === 1 ? '1 minute' : `${minutes} minutes`);

  if (parts.length === 0) {
    return 'Alarm rings in less than a minute';
  }

  return `Alarm rings in ${parts.join(' ')}`;
}

export interface LiveDialDurationParts {
  hoursText: string | null;
  minutesText: string;
}

/**
 * Returns structured duration parts for the vertical 3-line "Rings in" block in GoogleRadialClock:
 * - hoursText: e.g. "7h" (or null if < 1 hour so the hours line is omitted)
 * - minutesText: e.g. "24m"
 */
export function getLiveDialParts(
  alarm: Partial<AlarmItem> & { startHour: number; startMinute: number },
  referenceDate: Date = new Date()
): LiveDialDurationParts {
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
    isEscalating: alarm.isEscalating,
    customSteps: alarm.customSteps,
    repeatDays: alarm.repeatDays || [],
    label: alarm.label || '',
    isEnabled: true,
    dismissedForToday: false,
  };
  const targetDate = calculateNextOccurrence(fullAlarm, referenceDate);
  const diffMs = Math.max(0, targetDate.getTime() - referenceDate.getTime());
  const lang = useSettingsStore.getState().language;

  const totalMinutes = Math.max(1, Math.ceil(diffMs / (1000 * 60)));
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (lang === 'bn') {
    return {
      hoursText:
        totalHours > 0 ? `${formatNumberLocalized(totalHours, 'bn')}ঘঃ` : null,
      minutesText: `${formatNumberLocalized(minutes, 'bn')}মিঃ`,
    };
  }

  return {
    hoursText: totalHours > 0 ? `${totalHours}h` : null,
    minutesText: `${minutes}m`,
  };
}

/**
 * Returns compact countdown string for GreetingHeader Sleep Window Counter:
 * e.g. "6h 45m", "22m", "1d 4h"
 */
export function getCompactCountdownText(targetDate: Date, referenceDate: Date = new Date()): string {
  const diffMs = targetDate.getTime() - referenceDate.getTime();
  const lang = useSettingsStore.getState().language;

  if (diffMs <= 0) {
    return lang === 'bn' ? '<১মি' : '<1m';
  }

  const totalMinutes = Math.ceil(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (lang === 'bn') {
    if (days > 0) {
      return `${formatNumberLocalized(days, 'bn')}দিন ${formatNumberLocalized(hours, 'bn')}ঘণ্টা`;
    }
    if (hours > 0) {
      return minutes > 0
        ? `${formatNumberLocalized(hours, 'bn')}ঘঃ ${formatNumberLocalized(minutes, 'bn')}মিঃ`
        : `${formatNumberLocalized(hours, 'bn')}ঘঃ`;
    }
    return `${formatNumberLocalized(Math.max(1, minutes), 'bn')}মিঃ`;
  }

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${Math.max(1, minutes)}m`;
}

/**
 * Finds the earliest upcoming active alarm among all saved alarms.
 */
export function findNextUpcomingAlarm(
  alarms: AlarmItem[],
  referenceDate: Date = new Date()
): { nextAlarm: AlarmItem; nextDate: Date; countdownText: string } | null {
  const nowMs = referenceDate.getTime();
  const enabledAlarms = alarms.filter(
    (a) => a.isEnabled && !(a.pausedUntil && a.pausedUntil > nowMs)
  );
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
 * Formats repeat days into readable localized summary
 */
export function formatRepeatDays(repeatDays: number[]): string {
  const lang = useSettingsStore.getState().language;

  if (!repeatDays || repeatDays.length === 0) {
    return lang === 'bn' ? 'একবার' : 'One-off';
  }
  if (repeatDays.length === 7) {
    return lang === 'bn' ? 'প্রতিদিন' : 'Every day';
  }
  if (
    repeatDays.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => repeatDays.includes(d))
  ) {
    return lang === 'bn' ? 'সোম–শুক্র' : 'Weekdays (Mon–Fri)';
  }
  if (
    repeatDays.length === 5 &&
    [0, 1, 2, 3, 4].every((d) => repeatDays.includes(d))
  ) {
    return lang === 'bn' ? 'রবি–বৃহঃ' : 'Sun–Thu';
  }
  if (
    repeatDays.length === 2 &&
    [0, 6].every((d) => repeatDays.includes(d))
  ) {
    return lang === 'bn' ? 'ছুটির দিন (শনি–রবি)' : 'Weekends (Sat–Sun)';
  }
  if (
    repeatDays.length === 2 &&
    [5, 6].every((d) => repeatDays.includes(d))
  ) {
    return lang === 'bn' ? 'শুক্র–শনি' : 'Fri–Sat';
  }

  const dayNames =
    lang === 'bn'
      ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return repeatDays
    .slice()
    .sort((a, b) => a - b)
    .map((d) => dayNames[d])
    .join(', ');
}
