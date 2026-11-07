import React, { createContext, useContext, useMemo } from 'react';
import { darkTheme, lightTheme, ThemeColors } from './colors';
import { Typography } from './typography';
import { Radii } from './radii';
import { DarkShadows, LightShadows, Shadows } from './shadows';
import { Spacing } from './spacing';
import {
  DEFAULT_RESPONSIVE_METRICS,
  ResponsiveMetrics,
  useResponsive,
} from './useResponsive';
import { ThemeMode, useSettingsStore } from '../settings/settingsStore';

export interface ThemeContextValue {
  colors: ThemeColors;
  typography: typeof Typography;
  radii: typeof Radii;
  shadows: typeof Shadows;
  spacing: typeof Spacing;
  themeMode: ThemeMode;
  responsive: ResponsiveMetrics;
}

const defaultContextValue: ThemeContextValue = {
  colors: darkTheme,
  typography: Typography,
  radii: Radii,
  shadows: DarkShadows,
  spacing: Spacing,
  themeMode: 'dark',
  responsive: DEFAULT_RESPONSIVE_METRICS,
};

const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const responsive = useResponsive();

  const value = useMemo(() => {
    const scaledTypography: typeof Typography = {
      ...Typography,
      sizes: {
        heroClock: responsive.ms(Typography.sizes.heroClock),
        displayClock: responsive.ms(Typography.sizes.displayClock),
        subDisplay: responsive.ms(Typography.sizes.subDisplay),
        titleLarge: responsive.ms(Typography.sizes.titleLarge),
        titleMedium: responsive.ms(Typography.sizes.titleMedium),
        bodyLarge: responsive.ms(Typography.sizes.bodyLarge),
        bodyMedium: responsive.ms(Typography.sizes.bodyMedium),
        bodySmall: responsive.ms(Typography.sizes.bodySmall),
        caption: responsive.ms(Typography.sizes.caption),
      },
    };

    const scaledSpacing: typeof Spacing = {
      xs: responsive.s(Spacing.xs),
      sm: responsive.s(Spacing.sm),
      md: responsive.s(Spacing.md),
      lg: responsive.s(Spacing.lg),
      xl: responsive.s(Spacing.xl),
      xxl: responsive.s(Spacing.xxl),
      xxxl: responsive.s(Spacing.xxxl),
      huge: responsive.s(Spacing.huge),
    };

    return {
      colors: themeMode === 'light' ? lightTheme : darkTheme,
      typography: scaledTypography,
      radii: Radii,
      shadows: themeMode === 'light' ? LightShadows : DarkShadows,
      spacing: scaledSpacing,
      themeMode,
      responsive,
    };
  }, [themeMode, responsive]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  return useContext(ThemeContext) || defaultContextValue;
};
