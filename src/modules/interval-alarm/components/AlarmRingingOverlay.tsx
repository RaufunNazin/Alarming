import React, { useEffect, useRef, useCallback, useState } from 'react';
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
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { useTranslation } from '../../../core/i18n/translations';
import { useAlarmStore } from '../store/alarmStore';
import { alarmSoundPlayer } from '../../../core/audio/alarmSoundPlayer';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

export const AlarmRingingOverlay: React.FC = () => {
  const { colors, typography, radii, shadows, responsive } = useTheme();
  const { t, language, formatTime12h } = useTranslation();
  const defaultSnoozeMinutes = useSettingsStore((s) => s.defaultSnoozeMinutes);
  const volumeButtonAction = useSettingsStore((s) => s.volumeButtonAction);
  const {
    activeRinging,
    dismissSingleAlarm,
    dismissAllRemainingForToday,
    snoozeAlarm,
  } = useAlarmStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [now, setNow] = useState(() => new Date());

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
      setNow(new Date());
      const clockInterval = setInterval(() => {
        setNow(new Date());
      }, 1000);

      // Start audio chime and rhythmic haptic loop
      alarmSoundPlayer.startAlarmSound();

      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
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
        clearInterval(clockInterval);
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

  const headerTitleText = activeRinging.alarm.label?.trim() || t.timesUp;

  const { time: timeDigits, period: periodText } = formatTime12h(
    now.getHours(),
    now.getMinutes()
  );

  const actionBtnHeight = responsive.isVerySmall
    ? 80
    : responsive.isCompact
      ? 88
      : 106;
  const actionIconSize = Math.round(responsive.ms(34));

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={handleSnooze}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: responsive.topInset + responsive.s(18),
            paddingBottom: responsive.bottomNavInset + responsive.s(18),
          },
        ]}
      >
        {/* Top Header: Shows Alarm Label or "Time's up!" */}
        <View style={styles.topHeader}>
          <View style={styles.headerTitleRow}>
            <Bell
              size={Math.round(responsive.ms(22))}
              color={colors.accent}
              strokeWidth={2.4}
            />
            <Text
              numberOfLines={2}
              style={[
                styles.headerTitle,
                {
                  fontSize: responsive.ms(21),
                  color: colors.textPrimary,
                  fontFamily: typography.numbersBold,
                },
              ]}
            >
              {headerTitleText}
            </Text>
          </View>
        </View>

        {/* Center Clock (No Container Box, Small AM/PM) */}
        <View style={styles.centerSection}>
          <Animated.View
            style={[
              styles.timeRow,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Text
              style={[
                styles.timeDisplay,
                {
                  fontSize: responsive.ms(68),
                  lineHeight: responsive.ms(76),
                  color: colors.textPrimary,
                  fontFamily: typography.numbersBold,
                },
              ]}
            >
              {timeDigits}
            </Text>
            {periodText ? (
              <Text
                style={[
                  styles.periodDisplay,
                  {
                    fontSize: responsive.ms(16),
                    lineHeight: responsive.ms(22),
                    marginLeft: responsive.s(6),
                    marginBottom: responsive.s(10),
                    color: colors.textSecondary,
                    fontFamily: typography.numbersBold,
                  },
                ]}
              >
                {periodText}
              </Text>
            ) : null}
          </Animated.View>

          {isSequence && (
            <View style={[styles.alarmInfoBadge, { marginTop: responsive.s(10) }]}>
              <Text
                style={[
                  styles.stepCounterText,
                  {
                    fontSize: responsive.ms(13),
                    color: colors.accent,
                    fontFamily: typography.numbersBold,
                  },
                ]}
              >
                {t.alarmsActiveOfTotal(currentStep + 1, totalSteps)}
              </Text>
            </View>
          )}
        </View>

        {/* Big Action Buttons - Flex Side by Side */}
        <View
          style={[
            styles.actionsSection,
            {
              maxWidth: responsive.modalMaxWidth,
              alignSelf: 'center',
              paddingHorizontal: responsive.screenPadding,
            },
          ]}
        >
          <View style={[styles.actionsRow, { gap: responsive.s(14) }]}>
            {/* SNOOZE BUTTON */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSnooze}
              style={[
                styles.actionBigBtn,
                {
                  height: actionBtnHeight,
                  paddingVertical: responsive.s(12),
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardOuter,
                },
              ]}
            >
              <Clock
                size={actionIconSize}
                color={colors.textSecondary}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.actionSmallText,
                  {
                    fontSize: responsive.ms(11.5),
                    color: colors.textSecondary,
                    fontFamily: typography.numbersBold,
                  },
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
                  height: actionBtnHeight,
                  paddingVertical: responsive.s(12),
                  backgroundColor: colors.primary,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: radii.cardOuter,
                },
              ]}
            >
              <Sun size={actionIconSize} color="#FFFFFF" strokeWidth={2.4} />
              <Text
                style={[
                  styles.actionSmallText,
                  {
                    fontSize: responsive.ms(11.5),
                    color: '#FFFFFF',
                    fontFamily: typography.numbersBold,
                  },
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
                  marginTop: responsive.s(10),
                  paddingVertical: responsive.s(12),
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.buttonMedium,
                },
              ]}
            >
              <Text
                style={[
                  styles.dismissAllBtnText,
                  {
                    fontSize: responsive.ms(11.5),
                    color: colors.textSecondary,
                    fontFamily: typography.numbersBold,
                  },
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
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 21,
    letterSpacing: 0.3,
    textAlign: 'center',
    flexShrink: 1,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeDisplay: {
    fontSize: 68,
    lineHeight: 76,
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: -1,
  },
  periodDisplay: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.6,
    includeFontPadding: false,
  },
  alarmInfoBadge: {
    alignItems: 'center',
    gap: 4,
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
