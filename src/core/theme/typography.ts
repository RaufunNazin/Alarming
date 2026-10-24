import { Platform } from 'react-native';

export const Typography = {
  // Cursive warm romantic font (for love note greeting & titles)
  cursive: Platform.select({
    web: 'Caveat, "Caveat_600SemiBold", cursive',
    default: 'Caveat_600SemiBold',
  }),
  cursiveBold: Platform.select({
    web: 'Caveat, "Caveat_700Bold", cursive',
    default: 'Caveat_700Bold',
  }),
  cursiveRegular: Platform.select({
    web: 'Caveat, "Caveat_400Regular", cursive',
    default: 'Caveat_400Regular',
  }),

  // Crisp geometric font (for clock dials, digits, times, metadata)
  numbers: Platform.select({
    web: 'Outfit, "Outfit_600SemiBold", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Outfit_600SemiBold',
  }),
  numbersBold: Platform.select({
    web: 'Outfit, "Outfit_700Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Outfit_700Bold',
  }),
  numbersRegular: Platform.select({
    web: 'Outfit, "Outfit_400Regular", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Outfit_400Regular',
  }),
  numbersLight: Platform.select({
    web: 'Outfit, "Outfit_300Light", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Outfit_300Light',
  }),

  // Semantic sans aliases
  sansBold: Platform.select({
    web: 'Outfit, "Outfit_700Bold", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Outfit_700Bold',
  }),
  sansMedium: Platform.select({
    web: 'Outfit, "Outfit_600SemiBold", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Outfit_600SemiBold',
  }),
  sansRegular: Platform.select({
    web: 'Outfit, "Outfit_400Regular", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Outfit_400Regular',
  }),

  // Font sizes
  sizes: {
    heroClock: 64,
    displayClock: 56,
    subDisplay: 32,
    titleLarge: 24,
    titleMedium: 20,
    bodyLarge: 17,
    bodyMedium: 15,
    bodySmall: 13,
    caption: 11,
  },
};
