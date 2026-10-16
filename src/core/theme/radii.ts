/**
 * Enforced Radii Nesting Rules:
 * R_inner = R_outer - padding
 */
export const Radii = {
  modalOuter: 28,
  modalInnerContainer: 18, // 28 - 10 (or 28 - 12)

  cardOuter: 24,
  cardInnerElement: 16,    // 24 - 8 or 24 - 10
  
  squircleToggle: 18,      // Continuous curvature for 54x54px button
  
  buttonLarge: 18,
  buttonMedium: 14,
  chip: 12,
  pill: 9999,
  timeBox: 16,
};
