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
  modalSurface: string;
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
  accentSoft: string;
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

// 1. PURE DARK MODE (Dark + White + Crimson Accent) - Untouched
export const darkTheme: ThemeColors = {
  canvasGradientStart: '#0F0F11',
  canvasGradientEnd: '#141417',
  background: '#0F0F11',

  surface: '#18181B',
  surfaceHero: '#202024',
  surfaceElevated: '#18181B',
  surfaceSubtle: '#27272B',
  modalSurface: '#18181B',
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
  accentSoft: 'rgba(173, 52, 62, 0.16)',
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

  overlayBackdrop: 'rgba(10, 10, 14, 0.72)',
  overlayPrimaryBg: '#FFFFFF',
  overlayPrimaryText: '#0F0F11',
  overlaySecondaryBorder: 'rgba(255, 255, 255, 0.12)',
  overlaySecondaryBg: '#18181B',
  overlaySecondaryText: '#A1A1AA',
};

// 2. REFINED LIGHT MODE (Crisp White Cards + Soft Alabaster Canvas + Translucent Dark Backdrop)
export const lightTheme: ThemeColors = {
  canvasGradientStart: '#F7F7FA',
  canvasGradientEnd: '#F2F3F7',
  background: '#F5F6F9',

  surface: '#FFFFFF',
  surfaceHero: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F2F3F7',
  modalSurface: '#FFFFFF',
  surfaceBorder: 'rgba(17, 24, 39, 0.07)',
  surfaceBorderHighlight: 'rgba(17, 24, 39, 0.14)',

  // Card On / Off distinction for Light Mode
  cardOnBg: '#FFFFFF',
  cardOnBorder: 'rgba(17, 24, 39, 0.08)',
  cardOffBg: '#FAFBFD',
  cardOffBorder: 'rgba(17, 24, 39, 0.04)',

  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  primary: '#AD343E',
  primaryLight: '#B83B46',
  primaryDark: '#8C2730',
  primaryMuted: 'rgba(173, 52, 62, 0.10)',
  accent: '#AD343E',
  accentSoft: 'rgba(173, 52, 62, 0.10)',
  accentGold: '#AD343E',
  success: '#2E7D52',
  danger: '#D04A30',

  squircleOnBg: '#AD343E',
  squircleOffBg: '#F2F3F7',
  squircleBorder: 'rgba(17, 24, 39, 0.07)',
  squircleBorderOn: '#8C2730',
  squircleIconOn: '#FFFFFF',
  squircleIconOff: '#9CA3AF',

  dialFaceBg: '#F2F3F7',
  dialHandColor: '#AD343E',
  dialCenterDot: '#AD343E',
  dialNumberActive: '#FFFFFF',
  dialNumberInactive: '#374151',
  amPmActiveBg: 'rgba(173, 52, 62, 0.14)',
  amPmActiveText: '#AD343E',
  amPmInactiveText: '#6B7280',

  // Never use a white/light overlay in light mode — use a soft translucent dark dim
  overlayBackdrop: 'rgba(15, 18, 28, 0.42)',
  overlayPrimaryBg: '#111827',
  overlayPrimaryText: '#FFFFFF',
  overlaySecondaryBorder: 'rgba(17, 24, 39, 0.10)',
  overlaySecondaryBg: '#FFFFFF',
  overlaySecondaryText: '#4B5563',
};

export const theme: ThemeColors = darkTheme;
