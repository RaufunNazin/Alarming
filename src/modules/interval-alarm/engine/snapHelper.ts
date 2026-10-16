/**
 * Helper to calculate clean end times that align with exact whole interval steps
 * so that the user never needs to do mental math for uneven intervals.
 */
export function calculateSnappedEndTime(
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  intervalMinutes: number
): { snappedHour: number; snappedMinute: number; alarmCount: number } {
  const startTotalMinutes = startHour * 60 + startMinute;
  let endTotalMinutes = endHour * 60 + endMinute;

  // Handle midnight crossover
  if (endTotalMinutes <= startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  const duration = endTotalMinutes - startTotalMinutes;
  const interval = Math.max(1, intervalMinutes);

  // Round up to the nearest whole interval step
  const rawSteps = duration / interval;
  const snappedSteps = Math.max(1, Math.round(rawSteps));
  const snappedDuration = snappedSteps * interval;

  let finalTotalMinutes = (startTotalMinutes + snappedDuration) % (24 * 60);
  const snappedHour = Math.floor(finalTotalMinutes / 60);
  const snappedMinute = finalTotalMinutes % 60;

  return {
    snappedHour,
    snappedMinute,
    alarmCount: snappedSteps + 1, // inclusive of start and end
  };
}
