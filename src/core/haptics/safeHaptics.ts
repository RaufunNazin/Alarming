// Haptic vibrations completely disabled per user preference
export const SafeHaptics = {
  selectionAsync: async () => {},
  impactAsync: async () => {},
  notificationAsync: async () => {},

  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  } as const,
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  } as const,
};
