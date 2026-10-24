// Haptic vibrations completely disabled per user preference
export const SafeHaptics = {
  selectionAsync: async () => {},
  impactAsync: async (_style?: string) => {},
  notificationAsync: async (_type?: string) => {},

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

export const safeHaptics = SafeHaptics;
