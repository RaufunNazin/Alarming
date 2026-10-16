import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Sun, Clock, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { useAlarmStore } from '../store/alarmStore';

export const AlarmRingingOverlay: React.FC = () => {
  const { colors, typography, radii, shadows, spacing } = useTheme();
  const {
    activeRinging,
    loveNoteGreeting,
    dismissAllRemainingForToday,
    dismissSingleAlarm,
    snoozeAlarm,
  } = useAlarmStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (activeRinging) {
      // Trigger recurring subtle vibration & pulse
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [activeRinging, pulseAnim]);

  if (!activeRinging) return null;

  const isInterval = activeRinging.alarm.type === 'interval';

  const handleDismiss = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isInterval) {
      dismissAllRemainingForToday(activeRinging.alarm.id);
    } else {
      dismissSingleAlarm(activeRinging.alarm.id);
    }
  };

  const handleSnooze = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    snoozeAlarm(activeRinging.alarm.id, 10);
  };

  const currentStep = activeRinging.currentStepIndex ?? 0;
  const totalSteps = activeRinging.totalSteps ?? 1;

  return (
    <Modal visible={true} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Decorative Header */}
        <View style={styles.topHeader}>
          <Heart size={24} color={colors.primary} strokeWidth={2.4} />
          <Text
            style={[
              styles.greetingText,
              { color: colors.textPrimary, fontFamily: typography.cursive },
            ]}
          >
            {loveNoteGreeting}
          </Text>
        </View>

        {/* Center Clock & Ringing Visual */}
        <View style={styles.centerSection}>
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                borderColor: colors.primaryMuted,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.innerPulseCircle,
                { borderColor: colors.surfaceBorderHighlight },
              ]}
            >
              <Text
                style={[
                  styles.timeDisplay,
                  {
                    color: colors.textPrimary,
                    fontFamily: typography.numbersBold,
                  },
                ]}
              >
                {activeRinging.currentTimeString}
              </Text>
            </View>
          </Animated.View>

          <View style={styles.alarmInfoBadge}>
            <Text
              style={[
                styles.alarmLabel,
                { color: colors.textSecondary, fontFamily: typography.numbersBold },
              ]}
            >
              {activeRinging.alarm.label || (isInterval ? 'Morning Wakeup' : 'Alarm')}
            </Text>

            {isInterval && (
              <Text
                style={[
                  styles.stepCounterText,
                  { color: colors.accentGold, fontFamily: typography.numbersBold },
                ]}
              >
                Alarm {currentStep + 1} of {totalSteps}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons with GENEROUS 28px+ GAP */}
        <View style={[styles.actionsSection, { paddingHorizontal: spacing.xl }]}>
          {/* PRIMARY ACTION: Solid high-contrast filled pill */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleDismiss}
            style={[
              styles.primaryBtn,
              shadows.buttonPrimary,
              {
                backgroundColor: colors.overlayPrimaryBg,
                borderRadius: radii.buttonLarge,
              },
            ]}
          >
            <Sun size={22} color={colors.overlayPrimaryText} strokeWidth={2.4} />
            <Text
              style={[
                styles.primaryBtnText,
                {
                  color: colors.overlayPrimaryText,
                  fontFamily: typography.numbersBold,
                },
              ]}
            >
              {isInterval
                ? "I'M AWAKE • DISMISS ALL REMAINING"
                : 'DISMISS ALARM'}
            </Text>
          </TouchableOpacity>

          {/* Generous 28px vertical gap to completely eliminate mis-taps */}
          <View style={styles.buttonSeparatorGap} />

          {/* SECONDARY ACTION: Distinct outlined / frosted pill */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSnooze}
            style={[
              styles.secondaryBtn,
              {
                backgroundColor: colors.overlaySecondaryBg,
                borderColor: colors.overlaySecondaryBorder,
                borderRadius: radii.buttonLarge,
              },
            ]}
          >
            <Clock size={18} color={colors.overlaySecondaryText} strokeWidth={2.2} />
            <Text
              style={[
                styles.secondaryBtnText,
                {
                  color: colors.overlaySecondaryText,
                  fontFamily: typography.numbersBold,
                },
              ]}
            >
              {isInterval
                ? `SNOOZE TO NEXT (${activeRinging.alarm.intervalMinutes || 10}m)`
                : 'SNOOZE (10 MIN)'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  topHeader: {
    alignItems: 'center',
    gap: 8,
  },
  greetingText: {
    fontSize: 32,
    textAlign: 'center',
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  innerPulseCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDisplay: {
    fontSize: 58,
    lineHeight: 64,
  },
  alarmInfoBadge: {
    alignItems: 'center',
    gap: 4,
  },
  alarmLabel: {
    fontSize: 20,
  },
  stepCounterText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
  actionsSection: {
    width: '100%',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  buttonSeparatorGap: {
    height: 30, // Generous 30px gap to prevent accidental mis-taps
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderWidth: 1.5,
    width: '100%',
  },
  secondaryBtnText: {
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
