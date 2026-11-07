/**
 * Enforced Radii Hierarchy (+25% increased from the 50% baseline for balanced modern geometry):
 * Modal Outer: 15
 * Card Outer: 12
 * Card Inner / Inputs / Time Boxes: 9
 * Squircle Toggle: 10
 * Buttons: 8
 * Chips / Day Buttons / Segments: 6.5
 * Chip Inner (Active Segments): 4.5
 * Handle: 2.5
 */
export const Radii = {
  modalOuter: 15,          // Sheet top corners (was 12 -> +25% = 15)
  cardOuter: 12,           // Alarm list cards, time banner card (was 9 -> 12)
  card: 12,                // Alias for cardOuter (was 9 -> 12)
  cardInner: 9,            // Steppers, digital clock hour/minute boxes, empty icon box (was 7 -> 9)
  squircleToggle: 10,      // Toggle button (was 8 -> +25% = 10)
  button: 8,               // Primary & secondary action buttons (was 6 -> 8)
  buttonMedium: 8,         // Backward compatibility (was 6 -> 8)
  chip: 6.5,               // Segmented bar, repeat day buttons, edit time button (was 5 -> 6.5)
  pill: 6.5,               // Alias for chip/pill elements (was 5 -> 6.5)
  chipInner: 4.5,          // Active segment inside chip container (was 3.5 -> 4.5)
  timeBox: 9,              // Backward compatibility (was 7 -> 9)
  handle: 2.5,             // Top drag handle (was 2 -> 2.5)
};
