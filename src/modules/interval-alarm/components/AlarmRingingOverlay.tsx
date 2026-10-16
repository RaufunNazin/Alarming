import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Sun, Clock, Bell } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useAlarmStore } from '../store/alarmStore';
import { alarmSoundPlayer } from '../../../core/audio/alarmSoundPlayer';

export const AlarmRingingOverlay: React.FC = () => {
  const { colors, typography, radii, shadows } = useTheme();
  const {
    activeRinging,
    dismissSingleAlarm,
    snoozeAlarm,
  } = useAlarmStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

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
  const snoozeDuration = activeRinging.alarm.intervalMinutes || 10;

  const handleDismiss = () => {
    alarmSoundPlayer.stopAlarmSound();
    dismissSingleAlarm(activeRinging.alarm.id);
  };

  const handleSnooze = () => {
    alarmSoundPlayer.stopAlarmSound();
    snoozeAlarm(activeRinging.alarm.id, snoozeDuration);
  };

  const currentStep = activeRinging.currentStepIndex ?? 0;
  const totalSteps = activeRinging.totalSteps ?? 1;

  return (
    <Modal visible={true} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerTitleRow}>
            <Bell size={22} color={colors.accent} strokeWidth={2.4} />
            <Text
              style={[
                styles.headerTitle,
                { color: colors.textPrimary, fontFamily: typography.numbersBold },
              ]}
            >
              Alarm
            </Text>
          </View>
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
            {activeRinging.alarm.label ? (
              <Text
                style={[
                  styles.alarmLabel,
                  { color: colors.textSecondary, fontFamily: typography.numbersBold },
                ]}
              >
                {activeRinging.alarm.label}
              </Text>
            ) : null}

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

        {/* Big Action Buttons - Flex Side by Side */}
        <View style={styles.actionsSection}>
          <View style={styles.actionsRow}>
            {/* SNOOZE BUTTON */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSnooze}
              style={[
                styles.actionBigBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardOuter,
                },
              ]}
            >
              <Clock size={36} color={colors.textSecondary} strokeWidth={2.2} />
              <Text
                style={[
                  styles.actionSmallText,
                  { color: colors.textSecondary, fontFamily: typography.numbersBold },
                ]}
              >
                {`SNOOZE (${snoozeDuration}M)`}
              </Text>
            </TouchableOpacity>

            {/* STOP BUTTON */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleDismiss}
              style={[
                styles.actionBigBtn,
                shadows.buttonPrimary,
                {
                  backgroundColor: colors.primary,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: radii.cardOuter,
                },
              ]}
            >
              <Sun size={36} color="#FFFFFF" strokeWidth={2.4} />
              <Text
                style={[
                  styles.actionSmallText,
                  { color: '#FFFFFF', fontFamily: typography.numbersBold },
                ]}
              >
                STOP
              </Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    letterSpacing: 0.5,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  pulseCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  innerPulseCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDisplay: {
    fontSize: 44,
    lineHeight: 52,
    textAlign: 'center',
    includeFontPadding: false,
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
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  actionBigBtn: {
    flex: 1,
    height: 108,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  actionSmallText: {
    fontSize: 12,
    letterSpacing: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
});
