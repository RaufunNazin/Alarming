import { useMemo } from 'react';
import { Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ResponsiveMetrics {
  width: number;
  height: number;
  isCompact: boolean;
  isVerySmall: boolean;
  isTablet: boolean;
  fontScale: number;
  spaceScale: number;
  /** Scale spacing / paddings / layout dimensions */
  s: (size: number) => number;
  /** Vertical scale relative to height */
  vs: (size: number) => number;
  /** Moderate scale for font sizes and icon sizes */
  ms: (size: number, factor?: number) => number;
  /** Top safe-area inset (handles status bar / notch) */
  topInset: number;
  /** Bottom safe-area inset (handles 3-button nav ~48dp and gesture nav ~16-24dp) */
  bottomNavInset: number;
  /** Safe bottom padding for bottom-sheet modals and action bars */
  modalBottomPadding: number;
  /** Radial clock dial radius constrained by both screen width and height */
  dialRadius: number;
  /** Squircle toggle button size */
  toggleSize: number;
  /** Floating Action Button (+) size */
  fabSize: number;
  /** Alarm card internal padding */
  cardPadding: number;
  /** Screen horizontal padding */
  screenPadding: number;
  /** Max width for main content container on tablets */
  contentMaxWidth: number;
  /** Max width for bottom-sheet modals on tablets */
  modalMaxWidth: number;
}

const roundHalf = (val: number): number => Math.round(val * 2) / 2;

export function computeResponsiveMetrics(
  rawWidth: number,
  rawHeight: number,
  insets: { top: number; bottom: number; left: number; right: number }
): ResponsiveMetrics {
  const width = Math.max(rawWidth || 390, 280);
  const height = Math.max(rawHeight || 844, 480);

  const isTablet = width >= 600;
  // 720p phones have logical widths of 320px-360px (720px / 2x DPR = 360px) or short heights (<= 680px)
  const isCompact = !isTablet && (width <= 360 || height <= 680);
  const isVerySmall = !isTablet && (width <= 330 || height <= 600);

  // Effective width inside tablet container so phone UI elements don't balloon on 10" tablets
  const effectiveWidth = isTablet ? Math.min(width, 460) : width;

  let fontScale = 1;
  let spaceScale = 1;

  if (isVerySmall) {
    fontScale = 0.8;
    spaceScale = 0.72;
  } else if (isCompact) {
    // Interpolate between 320px (0.80) and 360px (0.86), also accounting for short 640px height
    const widthRatio = Math.max(0, Math.min(1, (width - 320) / 40));
    const heightPenalty = height <= 640 ? 0.03 : 0;
    fontScale = Math.max(0.8, 0.81 + widthRatio * 0.05 - heightPenalty);
    spaceScale = Math.max(0.72, 0.74 + widthRatio * 0.05 - heightPenalty);
  } else if (isTablet) {
    fontScale = 1.06;
    spaceScale = 1.08;
  } else {
    // Standard phones (361px to 599px)
    const stdRatio = Math.max(0, Math.min(1, (effectiveWidth - 360) / 52));
    fontScale = 0.92 + stdRatio * 0.08;
    spaceScale = 0.9 + stdRatio * 0.1;
  }

  const s = (size: number): number => roundHalf(size * spaceScale);
  const vs = (size: number): number => {
    const vRatio = Math.max(0.74, Math.min(1.1, height / 844));
    return roundHalf(size * vRatio);
  };
  const ms = (size: number, factor = 1): number => {
    const effectiveFactor = 1 + (fontScale - 1) * factor;
    return roundHalf(size * effectiveFactor);
  };

  // Safe area insets:
  // Android 3-button nav reports insets.bottom ~48dp (or if edge-to-edge isn't reported on older web/devices, we enforce at least 16dp)
  // Android Gesture nav reports insets.bottom ~16-24dp.
  const androidStatusBar = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;
  const topInset =
    Platform.OS === 'web'
      ? Math.max(insets.top, isCompact ? 10 : 14)
      : Math.max(insets.top, androidStatusBar, 20);

  const minBottomGap = Platform.OS === 'android' ? 20 : 16;
  const bottomNavInset = Math.max(insets.bottom, minBottomGap);
  const modalBottomPadding = bottomNavInset + (isCompact ? 8 : 12);

  // Clock dial radius constrained by BOTH width and height so 360x640 / 320x568 screens never overflow
  const maxRadiusByWidth = (Math.min(width, 480) - (isCompact ? 68 : 76)) / 2;
  const maxRadiusByHeight = height * (isVerySmall ? 0.175 : isCompact ? 0.185 : 0.2);
  const dialRadius = Math.round(
    Math.max(106, Math.min(maxRadiusByWidth, maxRadiusByHeight, isTablet ? 162 : 156))
  );

  const toggleSize = isVerySmall ? 40 : isCompact ? 44 : isTablet ? 56 : 52;
  const fabSize = isVerySmall ? 46 : isCompact ? 50 : isTablet ? 62 : 58;
  const cardPadding = isVerySmall ? 11 : isCompact ? 13 : isTablet ? 20 : 16;
  const screenPadding = isVerySmall ? 12 : isCompact ? 14 : isTablet ? 24 : 18;
  const contentMaxWidth = isTablet ? 720 : 480;
  const modalMaxWidth = isTablet ? 540 : 480;

  return {
    width,
    height,
    isCompact,
    isVerySmall,
    isTablet,
    fontScale,
    spaceScale,
    s,
    vs,
    ms,
    topInset,
    bottomNavInset,
    modalBottomPadding,
    dialRadius,
    toggleSize,
    fabSize,
    cardPadding,
    screenPadding,
    contentMaxWidth,
    modalMaxWidth,
  };
}

export const DEFAULT_RESPONSIVE_METRICS: ResponsiveMetrics = computeResponsiveMetrics(390, 844, {
  top: 24,
  bottom: 20,
  left: 0,
  right: 0,
});

export function useResponsive(): ResponsiveMetrics {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return useMemo(
    () =>
      computeResponsiveMetrics(width, height, {
        top: insets.top,
        bottom: insets.bottom,
        left: insets.left,
        right: insets.right,
      }),
    [width, height, insets.top, insets.bottom, insets.left, insets.right]
  );
}
