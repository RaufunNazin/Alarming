export interface ThemeColors {
  // Canvas
  canvasGradientStart: string;
  canvasGradientEnd: string;
  background: string;

  // Surfaces & Typography
  surface: string;
  surfaceHero: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  surfaceBorder: string;
  surfaceBorderHighlight: string;

  // Card On / Off distinction
  cardOnBg: string;
  cardOnBorder: string;
  cardOffBg: string;
  cardOffBorder: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;

  // Accents
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
  accent: string;
  accentGold: string;
  success: string;
  danger: string;

  // Squircle Toggle Button (54x54px)
  squircleOnBg: string;
  squircleOffBg: string;
  squircleBorder: string;
  squircleBorderOn: string;
  squircleIconOn: string;
  squircleIconOff: string;

  // Clock Dial Tokens
  dialFaceBg: string;
  dialHandColor: string;
  dialCenterDot: string;
  dialNumberActive: string;
  dialNumberInactive: string;
  amPmActiveBg: string;
  amPmActiveText: string;
  amPmInactiveText: string;

  // Ringing Overlay Tokens
  overlayBackdrop: string;
  overlayPrimaryBg: string;
  overlayPrimaryText: string;
  overlaySecondaryBorder: string;
  overlaySecondaryBg: string;
  overlaySecondaryText: string;
}

// 1. PURE DARK MODE (Dark + White + Crimson Accent) - Zero Beige
export const darkTheme: ThemeColors = {
  canvasGradientStart: '#0F0F11',
  canvasGradientEnd: '#141417',
  background: '#0F0F11',

  surface: '#18181B',
  surfaceHero: '#202024',
  surfaceElevated: '#18181B',
  surfaceSubtle: '#27272B',
  surfaceBorder: 'rgba(255, 255, 255, 0.08)',
  surfaceBorderHighlight: 'rgba(255, 255, 255, 0.16)',

  // Card On / Off distinction for Dark Mode
  cardOnBg: '#1B1B1F',                         // Slightly elevated slate
  cardOnBorder: 'rgba(255, 255, 255, 0.09)',
  cardOffBg: '#131316',                        // Receded shade blending into dark canvas
  cardOffBorder: 'rgba(255, 255, 255, 0.04)',

  textPrimary: '#FFFFFF',            // Crisp pure white
  textSecondary: '#A1A1AA',          // Light silver neutral
  textMuted: '#71717A',              // Subdued hint grey
  textOnPrimary: '#0F0F11',

  primary: '#AD343E',                // Rich Crimson
  primaryLight: '#C94D58',
  primaryDark: '#8C2730',
  primaryMuted: 'rgba(173, 52, 62, 0.18)',
  accent: '#AD343E',
  accentGold: '#C94D58',
  success: '#4c956c',
  danger: '#dc6040',

  squircleOnBg: '#AD343E',
  squircleOffBg: '#27272B',
  squircleBorder: 'rgba(255, 255, 255, 0.08)',
  squircleBorderOn: '#C94D58',
  squircleIconOn: '#FFFFFF',
  squircleIconOff: '#71717A',

  dialFaceBg: '#18181B',
  dialHandColor: '#AD343E',
  dialCenterDot: '#AD343E',
  dialNumberActive: '#FFFFFF',
  dialNumberInactive: '#A1A1AA',
  amPmActiveBg: 'rgba(173, 52, 62, 0.22)',
  amPmActiveText: '#FFFFFF',
  amPmInactiveText: '#A1A1AA',

  overlayBackdrop: 'rgba(15, 15, 17, 0.98)',
  overlayPrimaryBg: '#FFFFFF',
  overlayPrimaryText: '#0F0F11',
  overlaySecondaryBorder: 'rgba(255, 255, 255, 0.12)',
  overlaySecondaryBg: '#18181B',
  overlaySecondaryText: '#A1A1AA',
};

export const theme: ThemeColors = darkTheme;
