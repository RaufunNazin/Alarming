import React, { createContext, useContext, useMemo } from 'react';
import { darkTheme, lightTheme, ThemeColors } from './colors';
import { Typography } from './typography';
import { Radii } from './radii';
import { DarkShadows, LightShadows, Shadows } from './shadows';
import { Spacing } from './spacing';
import { ThemeMode, useSettingsStore } from '../settings/settingsStore';

export interface ThemeContextValue {
  colors: ThemeColors;
  typography: typeof Typography;
  radii: typeof Radii;
  shadows: typeof Shadows;
  spacing: typeof Spacing;
  themeMode: ThemeMode;
}

const defaultContextValue: ThemeContextValue = {
  colors: darkTheme,
  typography: Typography,
  radii: Radii,
  shadows: DarkShadows,
  spacing: Spacing,
  themeMode: 'dark',
};

const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const themeMode = useSettingsStore((state) => state.themeMode);

  const value = useMemo(
    () => ({
      colors: themeMode === 'light' ? lightTheme : darkTheme,
      typography: Typography,
      radii: Radii,
      shadows: themeMode === 'light' ? LightShadows : DarkShadows,
      spacing: Spacing,
      themeMode,
    }),
    [themeMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  return useContext(ThemeContext) || defaultContextValue;
};
