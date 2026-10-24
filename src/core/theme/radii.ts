/**
 * Enforced Radii Hierarchy (Nothing should be rounded full):
 * Modal Outer: 24
 * Card Outer: 18
 * Card Inner / Inputs / Time Boxes: 14
 * Squircle Toggle: 16
 * Buttons: 12
 * Chips / Day Buttons / Segments: 10
 * Chip Inner (Active Segments): 7 (10 - 3)
 * Handle: 2
 */
export const Radii = {
  modalOuter: 24,          // Sheet top corners
  cardOuter: 18,           // Alarm list cards, time banner card
  card: 18,                // Alias for cardOuter
  cardInner: 14,           // Steppers, digital clock hour/minute boxes, empty icon box
  squircleToggle: 16,      // 54x54 squircle toggle
  button: 12,              // Primary & secondary action buttons
  buttonMedium: 12,         // Backward compatibility
  chip: 10,                // Segmented bar, repeat day buttons, edit time button
  pill: 10,                // Alias for chip/pill elements
  chipInner: 7,            // Active segment inside chip container (10 - 3)
  timeBox: 14,             // Backward compatibility
  handle: 2,               // Top drag handle
};
