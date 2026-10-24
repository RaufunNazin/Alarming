import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import {
  ShieldCheck,
  BatteryWarning,
  VolumeX,
  BellOff,
} from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { useAlarmStore } from '../store/alarmStore';
import { alarmSoundPlayer, DeviceSafetyStatus } from '../../../core/audio/alarmSoundPlayer';
import {
  checkNotificationPermissions,
  initializeAlarmNotifications,
} from '../../../core/notifications/alarmNotifier';
import { formatNumberLocalized, useTranslation } from '../../../core/i18n/translations';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

export const SafetyCheckBanner: React.FC = React.memo(function SafetyCheckBanner() {
  const { colors, typography, radii, spacing } = useTheme();
  const { t, language } = useTranslation();
  const enableSafetyCheckBanner = useSettingsStore((s) => s.enableSafetyCheckBanner);
  const hasEnabledAlarm = useAlarmStore((s) => s.alarms.some((a) => a.isEnabled));

  const [safetyStatus, setSafetyStatus] = useState<DeviceSafetyStatus>({
    batteryLevel: 100,
    isCharging: true,
    alarmVolumePercent: 100,
    canUseFullScreenIntent: true,
  });
  const [notifGranted, setNotifGranted] = useState<boolean>(true);

  const refreshSafetyChecks = useCallback(async () => {
    if (!enableSafetyCheckBanner || !hasEnabledAlarm) return;
    try {
      const [deviceStatus, permStatus] = await Promise.all([
        alarmSoundPlayer.getDeviceSafetyStatus(),
        checkNotificationPermissions(),
      ]);
      setSafetyStatus((prev) =>
        prev.batteryLevel === deviceStatus.batteryLevel &&
        prev.isCharging === deviceStatus.isCharging &&
        prev.alarmVolumePercent === deviceStatus.alarmVolumePercent &&
        prev.canUseFullScreenIntent === deviceStatus.canUseFullScreenIntent
          ? prev
          : deviceStatus
      );
      setNotifGranted((prev) => (prev === permStatus.granted ? prev : permStatus.granted));
    } catch {
      // Ignore transient errors
    }
  }, [enableSafetyCheckBanner, hasEnabledAlarm]);

  useEffect(() => {
    if (!enableSafetyCheckBanner || !hasEnabledAlarm) return;

    void refreshSafetyChecks();
    const interval = setInterval(() => {
      void refreshSafetyChecks();
    }, 20000);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshSafetyChecks();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [enableSafetyCheckBanner, hasEnabledAlarm, refreshSafetyChecks]);

  if (!enableSafetyCheckBanner || !hasEnabledAlarm) {
    return null;
  }

  const isBatteryLow = safetyStatus.batteryLevel >= 0 && safetyStatus.batteryLevel < 20 && !safetyStatus.isCharging;
  const isVolumeLow = safetyStatus.alarmVolumePercent < 30;
  const isPermissionBlocked = !notifGranted || !safetyStatus.canUseFullScreenIntent;
  const hasAnyWarning = isBatteryLow || isVolumeLow || isPermissionBlocked;

  const handlePermissionFix = async () => {
    safeHaptics.selectionAsync();
    if (!notifGranted) {
      await initializeAlarmNotifications();
      const status = await checkNotificationPermissions();
      setNotifGranted(status.granted);
    } else if (!safetyStatus.canUseFullScreenIntent) {
      alarmSoundPlayer.openFullScreenIntentSettings();
    }
  };

  if (!hasAnyWarning) {
    return (
      <View
        style={[
          styles.wrapper,
          { paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
        ]}
      >
        <View
          style={[
            styles.allGoodPill,
            {
              backgroundColor: 'rgba(16, 185, 129, 0.10)',
              borderColor: 'rgba(16, 185, 129, 0.28)',
              borderRadius: radii.pill,
            },
          ]}
        >
          <ShieldCheck size={13} color={colors.success} />
          <Text
            style={[
              styles.allGoodText,
              {
                color: colors.success,
                fontFamily: typography.sansMedium,
              },
            ]}
          >
            {t.safetyAllSystemsGo}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.warningsContainer,
        { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
      ]}
    >
      {isBatteryLow && (
        <View
          style={[
            styles.warningCard,
            {
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              borderColor: 'rgba(245, 158, 11, 0.35)',
              borderRadius: radii.button,
            },
          ]}
        >
          <BatteryWarning size={15} color="#F59E0B" />
          <Text
            style={[
              styles.warningText,
              { color: colors.textPrimary, fontFamily: typography.sansMedium },
            ]}
          >
            {t.safetyBatteryLowPrefix} (
            {formatNumberLocalized(safetyStatus.batteryLevel, language)}%)
            {t.safetyBatteryLowSuffix}
          </Text>
        </View>
      )}

      {isVolumeLow && (
        <View
          style={[
            styles.warningCard,
            {
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              borderColor: 'rgba(245, 158, 11, 0.35)',
              borderRadius: radii.button,
            },
          ]}
        >
          <VolumeX size={15} color="#F59E0B" />
          <Text
            style={[
              styles.warningText,
              { color: colors.textPrimary, fontFamily: typography.sansMedium },
            ]}
          >
            {t.safetyVolumeLow} (
            {formatNumberLocalized(safetyStatus.alarmVolumePercent, language)}%)
          </Text>
        </View>
      )}

      {isPermissionBlocked && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handlePermissionFix}
          style={[
            styles.warningCard,
            {
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.35)',
              borderRadius: radii.button,
            },
          ]}
        >
          <BellOff size={15} color={colors.danger} />
          <Text
            style={[
              styles.warningText,
              { color: colors.textPrimary, fontFamily: typography.sansMedium },
            ]}
          >
            {t.safetyNotificationsBlocked}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allGoodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  allGoodText: {
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
  warningsContainer: {
    gap: 6,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
