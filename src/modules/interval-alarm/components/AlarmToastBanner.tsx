import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { useTheme } from '../../../core/theme';
import { useAlarmStore } from '../store/alarmStore';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

interface AlarmToastBannerProps {
  bottomOffset?: number;
  horizontalMargin?: number;
}

const useNativeDriver = Platform.OS !== 'web';

export const AlarmToastBanner: React.FC<AlarmToastBannerProps> = ({
  bottomOffset = 92,
  horizontalMargin = 16,
}) => {
  const { colors, typography, radii, shadows, themeMode } = useTheme();
  const toastMessage = useAlarmStore((s) => s.toastMessage);
  const toastActionLabel = useAlarmStore((s) => s.toastActionLabel);
  const onToastAction = useAlarmStore((s) => s.onToastAction);
  const hideToast = useAlarmStore((s) => s.hideToast);

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [translateYAnim] = useState(() => new Animated.Value(14));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver,
      }),
      Animated.timing(translateYAnim, {
        toValue: 10,
        duration: 180,
        useNativeDriver,
      }),
    ]).start(() => {
      hideToast();
    });
  }, [fadeAnim, hideToast, translateYAnim]);

  useEffect(() => {
    if (toastMessage) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      fadeAnim.setValue(0);
      translateYAnim.setValue(14);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          tension: 70,
          friction: 8,
          useNativeDriver,
        }),
      ]).start();

      const durationMs = toastActionLabel ? 5000 : 3500;
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, durationMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toastMessage, toastActionLabel, handleDismiss, fadeAnim, translateYAnim]);

  if (!toastMessage) {
    return null;
  }

  // Parse "Alarm set for <time> from now" to highlight <time> only with accent color
  const match = toastMessage.match(/^(Alarm set for\s+)(.+?)(\s+from now)$/i);

  const handleActionPress = () => {
    safeHaptics.selectionAsync();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (onToastAction) {
      onToastAction();
    } else {
      handleDismiss();
    }
  };

  return (
    <View
      style={[
        styles.overlayContainer,
        {
          bottom: bottomOffset,
          left: horizontalMargin,
          right: horizontalMargin,
        },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          styles.toastCard,
          shadows.card,
          {
            backgroundColor: themeMode === 'light' ? '#FFFFFF' : '#DCDCE0',
            borderColor:
              themeMode === 'light' ? colors.surfaceBorder : 'rgba(0, 0, 0, 0.08)',
            borderRadius: radii.button,
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        <View style={styles.rowContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleDismiss}
            style={styles.touchableContent}
            accessibilityRole="alert"
            accessibilityLabel={toastMessage}
          >
            {match ? (
              <Text
                style={[
                  styles.toastText,
                  {
                    color: '#18181B',
                    fontFamily: typography.numbersBold,
                  },
                ]}
                numberOfLines={2}
              >
                {match[1]}
                <Text style={{ color: colors.accent, fontFamily: typography.numbersBold }}>
                  {match[2]}
                </Text>
                {match[3]}
              </Text>
            ) : (
              <Text
                style={[
                  styles.toastText,
                  {
                    color: '#18181B',
                    fontFamily: typography.numbersBold,
                  },
                ]}
                numberOfLines={2}
              >
                {toastMessage}
              </Text>
            )}
          </TouchableOpacity>

          {toastActionLabel && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleActionPress}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radii.pill,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={toastActionLabel}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color: '#FFFFFF',
                    fontFamily: typography.sansBold,
                  },
                ]}
              >
                {toastActionLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    zIndex: 99999,
  },
  toastCard: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  touchableContent: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  toastText: {
    fontSize: 13.5,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
