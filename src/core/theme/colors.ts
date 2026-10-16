export interface ThemeColors {
  // 60% Dominant Canvas & Ambient Gradient
  canvasGradientStart: string;
  canvasGradientEnd: string;
  background: string;

  // 30% Structural Surfaces & Typography
  surface: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  surfaceBorder: string;
  surfaceBorderHighlight: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;

  // 10% High-Impact Romantic Accents
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;
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

export const darkTheme: ThemeColors = {
  // 60% Velvet Plum Canvas
  canvasGradientStart: '#130E14',
  canvasGradientEnd: '#1A111A',
  background: '#130E14',

  // 30% Structural Surfaces & Text
  surface: '#1F1620',
  surfaceElevated: '#281C2A',
  surfaceSubtle: '#332336',
  surfaceBorder: '#352538',
  surfaceBorderHighlight: '#5A3D5E',

  textPrimary: '#FFF1F2',
  textSecondary: '#FDA4AF',
  textMuted: '#9F8A96',
  textOnPrimary: '#FFFFFF',

  // 10% High-Impact Accents
  primary: '#E11D48',
  primaryLight: '#FB7185',
  primaryDark: '#BE123C',
  primaryMuted: 'rgba(225, 29, 72, 0.15)',
  accentGold: '#F59E0B',
  success: '#10B981',
  danger: '#EF4444',

  // Squircle Toggle (54x54px)
  squircleOnBg: '#E11D48',
  squircleOffBg: '#2D1F30',
  squircleBorder: '#4A334E',
  squircleBorderOn: '#FB7185',
  squircleIconOn: '#FFFFFF',
  squircleIconOff: '#7A627E',

  // Clock Dial
  dialFaceBg: '#1A121B',
  dialHandColor: '#E11D48',
  dialCenterDot: '#FB7185',
  dialNumberActive: '#FFFFFF',
  dialNumberInactive: '#FFF1F2',
  amPmActiveBg: 'rgba(225, 29, 72, 0.25)',
  amPmActiveText: '#FB7185',
  amPmInactiveText: '#9F8A96',

  // Ringing Overlay
  overlayBackdrop: 'rgba(12, 8, 13, 0.95)',
  overlayPrimaryBg: '#E11D48',
  overlayPrimaryText: '#FFFFFF',
  overlaySecondaryBorder: '#4A334E',
  overlaySecondaryBg: 'rgba(51, 35, 54, 0.65)',
  overlaySecondaryText: '#FDA4AF',
};

export const lightTheme: ThemeColors = {
  // 60% Petal Cream Canvas
  canvasGradientStart: '#FFF8F8',
  canvasGradientEnd: '#FFF0F2',
  background: '#FFF8F8',

  // 30% Structural Surfaces & Text
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#FFE4E6',
  surfaceBorder: '#FCE7F3',
  surfaceBorderHighlight: '#F472B6',

  textPrimary: '#4C0519',
  textSecondary: '#881337',
  textMuted: '#9F7582',
  textOnPrimary: '#FFFFFF',

  // 10% High-Impact Accents
  primary: '#BE123C',
  primaryLight: '#E11D48',
  primaryDark: '#9F1239',
  primaryMuted: 'rgba(190, 18, 60, 0.08)',
  accentGold: '#D97706',
  success: '#059669',
  danger: '#DC2626',

  // Squircle Toggle (54x54px)
  squircleOnBg: '#BE123C',
  squircleOffBg: '#F3E8EB',
  squircleBorder: '#E5D0D5',
  squircleBorderOn: '#BE123C',
  squircleIconOn: '#FFFFFF',
  squircleIconOff: '#9E868D',

  // Clock Dial
  dialFaceBg: '#FFF5F6',
  dialHandColor: '#BE123C',
  dialCenterDot: '#E11D48',
  dialNumberActive: '#FFFFFF',
  dialNumberInactive: '#4C0519',
  amPmActiveBg: 'rgba(190, 18, 60, 0.15)',
  amPmActiveText: '#BE123C',
  amPmInactiveText: '#9F7582',

  // Ringing Overlay
  overlayBackdrop: 'rgba(255, 248, 248, 0.98)',
  overlayPrimaryBg: '#BE123C',
  overlayPrimaryText: '#FFFFFF',
  overlaySecondaryBorder: '#E5D0D5',
  overlaySecondaryBg: 'rgba(255, 255, 255, 0.95)',
  overlaySecondaryText: '#881337',
};
