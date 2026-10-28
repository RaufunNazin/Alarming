import React, { useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Sun, Clock, Bell, Volume2 } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { useTranslation } from '../../../core/i18n/translations';
import { useAlarmStore } from '../store/alarmStore';
import { alarmSoundPlayer } from '../../../core/audio/alarmSoundPlayer';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

export const AlarmRingingOverlay: React.FC = () => {
  const { colors, typography, radii, shadows } = useTheme();
  const { t, language, formatNum } = useTranslation();
  const defaultSnoozeMinutes = useSettingsStore((s) => s.defaultSnoozeMinutes);
  const volumeButtonAction = useSettingsStore((s) => s.volumeButtonAction);
  const {
    activeRinging,
    dismissSingleAlarm,
    dismissAllRemainingForToday,
    snoozeAlarm,
  } = useAlarmStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const isSequence = Boolean(
    activeRinging &&
      (activeRinging.alarm.type === 'interval' || activeRinging.alarm.type === 'offset')
  );
  const snoozeDuration =
    activeRinging && isSequence && !activeRinging.alarm.isEscalating
      ? activeRinging.alarm.intervalMinutes || defaultSnoozeMinutes || 10
      : defaultSnoozeMinutes || 10;

  const handleDismiss = useCallback(() => {
    if (!activeRinging) return;
    safeHaptics.notificationAsync(safeHaptics.NotificationFeedbackType.Success);
    alarmSoundPlayer.finishLockScreenAlarmIfLocked();
    void dismissSingleAlarm(activeRinging.alarm.id);
  }, [activeRinging, dismissSingleAlarm]);

  const handleDismissAllRemaining = useCallback(() => {
    if (!activeRinging) return;
    safeHaptics.notificationAsync(safeHaptics.NotificationFeedbackType.Success);
    alarmSoundPlayer.finishLockScreenAlarmIfLocked();
    void dismissAllRemainingForToday(activeRinging.alarm.id);
  }, [activeRinging, dismissAllRemainingForToday]);

  const handleSnooze = useCallback(() => {
    if (!activeRinging) return;
    safeHaptics.selectionAsync();
    alarmSoundPlayer.finishLockScreenAlarmIfLocked();
    void snoozeAlarm(activeRinging.alarm.id, snoozeDuration);
  }, [activeRinging, snoozeAlarm, snoozeDuration]);

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

      // Subscribe to hardware volume button press events
      const removeVolumeListener = alarmSoundPlayer.addHardwareVolumeListener(() => {
        if (volumeButtonAction === 'snooze') {
          handleSnooze();
        } else if (volumeButtonAction === 'dismiss') {
          handleDismiss();
        }
      });

      return () => {
        animation.stop();
        removeVolumeListener();
        alarmSoundPlayer.stopAlarmSound();
      };
    }
  }, [activeRinging, pulseAnim, volumeButtonAction, handleSnooze, handleDismiss]);

  if (!activeRinging) return null;

  const currentStep = activeRinging.currentStepIndex ?? 0;
  const totalSteps = activeRinging.totalSteps ?? 1;
  const hasRemainingSteps = isSequence && currentStep + 1 < totalSteps;

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={handleSnooze}
    >
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
              {t.ringingNow}
            </Text>
          </View>
        </View>

        {/* Center Clock & Ringing Visual */}
        <View style={styles.centerSection}>
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                borderColor: colors.surfaceBorder,
                borderRadius: radii.modalOuter,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.innerPulseCircle,
                {
                  borderColor: colors.surfaceBorderHighlight,
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: radii.cardOuter,
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
                {formatNum(activeRinging.currentTimeString)}
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

            {isSequence && (
              <Text
                style={[
                  styles.stepCounterText,
                  { color: colors.accent, fontFamily: typography.numbersBold },
                ]}
              >
                {t.alarmsActiveOfTotal(currentStep + 1, totalSteps)}
              </Text>
            )}

            {volumeButtonAction !== 'none' && (
              <View
                style={[
                  styles.volumeHintPill,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Volume2 size={12} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.volumeHintText,
                    { color: colors.textSecondary, fontFamily: typography.sansMedium },
                  ]}
                >
                  {language === 'bn'
                    ? `ভলিউম বাটন: ${
                        volumeButtonAction === 'snooze'
                          ? t.volumeActionSnooze
                          : t.volumeActionDismiss
                      }`
                    : `Volume button: ${
                        volumeButtonAction === 'snooze'
                          ? t.volumeActionSnooze
                          : t.volumeActionDismiss
                      }`}
                </Text>
              </View>
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
                {t.snoozeBtn(snoozeDuration).toUpperCase()}
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
                {t.dismissAlarmBtn.toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          {hasRemainingSteps && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleDismissAllRemaining}
              style={[
                styles.dismissAllBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.buttonMedium,
                },
              ]}
            >
              <Text
                style={[
                  styles.dismissAllBtnText,
                  { color: colors.textSecondary, fontFamily: typography.numbersBold },
                ]}
              >
                {language === 'bn'
                  ? 'আজকের বাকি সব অ্যালার্ম বন্ধ করুন'
                  : 'DISMISS ALL REMAINING TODAY'}
              </Text>
            </TouchableOpacity>
          )}
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
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  innerPulseCircle: {
    width: 220,
    height: 220,
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
  volumeHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    marginTop: 6,
  },
  volumeHintText: {
    fontSize: 11.5,
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
  dismissAllBtn: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dismissAllBtnText: {
    fontSize: 12,
    letterSpacing: 0.6,
  },
});
