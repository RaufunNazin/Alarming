import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Sun, Clock, Bell, Volume2, VolumeX } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useAlarmStore } from '../store/alarmStore';
import { alarmSoundPlayer } from '../../../core/audio/alarmSoundPlayer';

export const AlarmRingingOverlay: React.FC = () => {
  const { colors, typography, radii, shadows, spacing } = useTheme();
  const {
    activeRinging,
    dismissAllRemainingForToday,
    dismissSingleAlarm,
    snoozeAlarm,
  } = useAlarmStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isMuted, setIsMuted] = useState(alarmSoundPlayer.getIsMuted());

  useEffect(() => {
    if (activeRinging) {
      // Start audio chime and rhythmic haptic loop
      alarmSoundPlayer.startAlarmSound();

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
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
      return () => {
        animation.stop();
        alarmSoundPlayer.stopAlarmSound();
      };
    }
  }, [activeRinging, pulseAnim]);

  if (!activeRinging) return null;

  const isInterval = activeRinging.alarm.type === 'interval';

  const handleDismiss = () => {
    alarmSoundPlayer.stopAlarmSound();
    if (isInterval) {
      dismissAllRemainingForToday(activeRinging.alarm.id);
    } else {
      dismissSingleAlarm(activeRinging.alarm.id);
    }
  };

  const handleSnooze = () => {
    alarmSoundPlayer.stopAlarmSound();
    snoozeAlarm(activeRinging.alarm.id, 10);
  };

  const handleToggleMute = () => {
    const muted = alarmSoundPlayer.toggleMute();
    setIsMuted(muted);
  };

  const currentStep = activeRinging.currentStepIndex ?? 0;
  const totalSteps = activeRinging.totalSteps ?? 1;

  return (
    <Modal visible={true} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeft}>
            <Bell size={24} color={colors.accent} strokeWidth={2.2} />
            <Text
              style={[
                styles.headerTitle,
                { color: colors.textPrimary, fontFamily: typography.numbersBold },
              ]}
            >
              Alarm
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleToggleMute}
            style={[
              styles.muteBtn,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.surfaceBorder,
                borderRadius: radii.chip,
              },
            ]}
            accessibilityLabel={isMuted ? 'Unmute alarm sound' : 'Mute alarm sound'}
          >
            {isMuted ? (
              <VolumeX size={18} color={colors.textSecondary} />
            ) : (
              <Volume2 size={18} color={colors.accent} />
            )}
          </TouchableOpacity>
        </View>

        {/* Center Clock & Ringing Visual */}
        <View style={styles.centerSection}>
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                borderColor: 'rgba(255, 255, 255, 0.08)',
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.innerPulseCircle,
                {
                  borderColor: 'rgba(255, 255, 255, 0.16)',
                  backgroundColor: colors.surfaceElevated,
                },
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
                  { color: colors.accent, fontFamily: typography.numbersBold },
                ]}
              >
                Alarm {currentStep + 1} of {totalSteps}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons with GENEROUS 28px GAP */}
        <View style={[styles.actionsSection, { paddingHorizontal: spacing.xl }]}>
          {/* PRIMARY ACTION: Solid high-contrast pill */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleDismiss}
            style={[
              styles.primaryBtn,
              shadows.buttonPrimary,
              {
                backgroundColor: colors.textPrimary,
                borderRadius: radii.cardOuter,
              },
            ]}
          >
            <Sun size={20} color={colors.textOnPrimary} strokeWidth={2.4} />
            <Text
              style={[
                styles.primaryBtnText,
                {
                  color: colors.textOnPrimary,
                  fontFamily: typography.numbersBold,
                },
              ]}
            >
              {isInterval
                ? "I'm Awake • Dismiss All"
                : 'Dismiss'}
            </Text>
          </TouchableOpacity>

          {/* Generous 28px vertical gap to completely eliminate mis-taps */}
          <View style={styles.buttonSeparatorGap} />

          {/* SECONDARY ACTION: Distinct outlined card button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSnooze}
            style={[
              styles.secondaryBtn,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.surfaceBorder,
                borderRadius: radii.cardOuter,
              },
            ]}
          >
            <Clock size={18} color={colors.textSecondary} strokeWidth={2.2} />
            <Text
              style={[
                styles.secondaryBtnText,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.numbersBold,
                },
              ]}
            >
              {isInterval
                ? `Snooze to Next (${activeRinging.alarm.intervalMinutes || 10}m)`
                : 'Snooze 10 min'}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  muteBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    letterSpacing: 0.5,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  innerPulseCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDisplay: {
    fontSize: 56,
    lineHeight: 62,
  },
  alarmInfoBadge: {
    alignItems: 'center',
    gap: 4,
  },
  alarmLabel: {
    fontSize: 18,
  },
  stepCounterText: {
    fontSize: 13,
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
    paddingVertical: 16,
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 15,
    letterSpacing: 0.5,
  },
  buttonSeparatorGap: {
    height: 28, // Generous 28px gap to prevent accidental mis-taps
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderWidth: 1,
    width: '100%',
  },
  secondaryBtnText: {
    fontSize: 14,
    letterSpacing: 0.4,
  },
});
