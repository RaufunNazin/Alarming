import React, { createContext, useContext } from 'react';
import { darkTheme, ThemeColors } from './colors';
import { Typography } from './typography';
import { Radii } from './radii';
import { Shadows } from './shadows';
import { Spacing } from './spacing';

interface ThemeContextValue {
  colors: ThemeColors;
  typography: typeof Typography;
  radii: typeof Radii;
  shadows: typeof Shadows;
  spacing: typeof Spacing;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeContext.Provider
      value={{
        colors: darkTheme,
        typography: Typography,
        radii: Radii,
        shadows: Shadows,
        spacing: Spacing,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
