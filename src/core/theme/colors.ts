export interface ThemeColors {
  // 60% Dominant Canvas (Deep Midnight Charcoal, serene & quiet)
  canvasGradientStart: string;
  canvasGradientEnd: string;
  background: string;

  // 30% Structural Surfaces & Typography
  surface: string;
  surfaceHero: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  surfaceBorder: string;
  surfaceBorderHighlight: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;

  // 10% Accents (Muted Dusty Rose & Warm Sand - gentle & glare-free)
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
  // 60% Midnight Charcoal Canvas (Quiet, serene, non-glaring)
  canvasGradientStart: '#111012',
  canvasGradientEnd: '#161518',
  background: '#111012',

  // 30% Structural Surfaces
  surface: '#1A191D',              // Standard alarm card
  surfaceHero: '#242129',          // Distinct Hero card surface
  surfaceElevated: '#201E25',      // Modal background
  surfaceSubtle: '#27252D',        // Chips, inputs & subtle backgrounds
  surfaceBorder: '#2C2933',        // Elegant low-contrast border
  surfaceBorderHighlight: '#484052', // Distinct Hero card border highlight

  // Text
  textPrimary: '#F2EEF3',          // Soft warm off-white (not stark white)
  textSecondary: '#C5BDCA',        // Muted grey-lavender
  textMuted: '#7E7785',            // Subdued metadata
  textOnPrimary: '#FFFFFF',

  // 10% Accents: Muted Dusty Rose & Warm Sand (Gentle, never neon)
  primary: '#C9939B',              // Muted Dusty Rose
  primaryLight: '#D8A7AF',
  primaryDark: '#B37D85',
  primaryMuted: 'rgba(201, 147, 155, 0.16)',
  accentGold: '#D4A373',           // Soft warm sand
  success: '#81B29A',              // Muted sage green
  danger: '#E07A5F',               // Muted terracotta

  // Squircle Toggle (54x54px)
  squircleOnBg: '#C9939B',
  squircleOffBg: '#232128',
  squircleBorder: '#35313D',
  squircleBorderOn: '#D8A7AF',
  squircleIconOn: '#151417',        // Crisp dark icon on dusty rose
  squircleIconOff: '#7E7785',

  // Clock Dial
  dialFaceBg: '#18171B',
  dialHandColor: '#C9939B',
  dialCenterDot: '#D8A7AF',
  dialNumberActive: '#FFFFFF',
  dialNumberInactive: '#F2EEF3',
  amPmActiveBg: 'rgba(201, 147, 155, 0.22)',
  amPmActiveText: '#D8A7AF',
  amPmInactiveText: '#7E7785',

  // Ringing Overlay
  overlayBackdrop: 'rgba(12, 11, 14, 0.96)',
  overlayPrimaryBg: '#C9939B',
  overlayPrimaryText: '#151417',
  overlaySecondaryBorder: '#35313D',
  overlaySecondaryBg: 'rgba(35, 33, 40, 0.75)',
  overlaySecondaryText: '#C5BDCA',
};
