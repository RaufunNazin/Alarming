import React, { createContext, useContext, useMemo } from 'react';
import { darkTheme, ThemeColors } from './colors';
import { Typography } from './typography';
import { Radii } from './radii';
import { Shadows } from './shadows';
import { Spacing } from './spacing';

export interface ThemeContextValue {
  colors: ThemeColors;
  typography: typeof Typography;
  radii: typeof Radii;
  shadows: typeof Shadows;
  spacing: typeof Spacing;
  themeMode: 'dark';
}

const defaultContextValue: ThemeContextValue = {
  colors: darkTheme,
  typography: Typography,
  radii: Radii,
  shadows: Shadows,
  spacing: Spacing,
  themeMode: 'dark',
};

const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useMemo(
    () => ({
      colors: darkTheme,
      typography: Typography,
      radii: Radii,
      shadows: Shadows,
      spacing: Spacing,
      themeMode: 'dark' as const,
    }),
    []
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
