import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, Linking } from 'react-native';
import { Settings, Flame, ShieldCheck, AlertTriangle, X } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useTranslation } from '../../../core/i18n/translations';
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { useAlarmStore } from '../store/alarmStore';
import { alarmSoundPlayer, DeviceSafetyStatus } from '../../../core/audio/alarmSoundPlayer';
import {
  checkNotificationPermissions,
  initializeAlarmNotifications,
} from '../../../core/notifications/alarmNotifier';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

interface GreetingHeaderProps {
  onOpenSettings?: () => void;
}

const SAFE_ALARM_VOLUME_THRESHOLD = 80;
const LOW_BATTERY_WARNING_THRESHOLD = 20;

export const GreetingHeader: React.FC<GreetingHeaderProps> = React.memo(function GreetingHeader({
  onOpenSettings,
}) {
  const { colors, typography, spacing, radii } = useTheme();
  const { t, language } = useTranslation();
  const intervalModeType = useSettingsStore((s) => s.intervalModeType);
  const enableSafetyCheckBanner = useSettingsStore((s) => s.enableSafetyCheckBanner);

  const [safetyStatus, setSafetyStatus] = useState<DeviceSafetyStatus>({
    batteryLevel: 100,
    isCharging: true,
    alarmVolumePercent: 100,
    canUseFullScreenIntent: true,
  });
  const [notifGranted, setNotifGranted] = useState<boolean>(true);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSafetyChecks = useCallback(async () => {
    if (!enableSafetyCheckBanner) return;
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
  }, [enableSafetyCheckBanner]);

  useEffect(() => {
    if (!enableSafetyCheckBanner) return;

    void refreshSafetyChecks();
    // Poll every 2.5s while active so volume slider changes in the OS overlay are reflected quickly
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        void refreshSafetyChecks();
      }
    }, 2500);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshSafetyChecks();
      }
    });

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [enableSafetyCheckBanner, refreshSafetyChecks]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const isPermissionsReady = notifGranted && safetyStatus.canUseFullScreenIntent;
  const isVolumeMuted = safetyStatus.alarmVolumePercent <= 0;
  const isVolumeReduced = safetyStatus.alarmVolumePercent < SAFE_ALARM_VOLUME_THRESHOLD;
  const isBatteryLow =
    !safetyStatus.isCharging && safetyStatus.batteryLevel <= LOW_BATTERY_WARNING_THRESHOLD;

  const badgeStatus: 'healthy' | 'warning' | 'danger' =
    !isPermissionsReady || isVolumeMuted
      ? 'danger'
      : isVolumeReduced || isBatteryLow
        ? 'warning'
        : 'healthy';

  const showTimedToast = (
    message: string,
    actionLabel: string | null = null,
    onAction: (() => void) | null = null,
    durationMs: number = 3800
  ) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    useAlarmStore.setState({
      toastMessage: message,
      toastActionLabel: actionLabel,
      onToastAction: onAction,
    });
    toastTimerRef.current = setTimeout(() => {
      useAlarmStore.setState({
        toastMessage: null,
        toastActionLabel: null,
        onToastAction: null,
      });
    }, durationMs);
  };

  const handleSafetyBadgePress = async () => {
    safeHaptics.selectionAsync();
    await refreshSafetyChecks();

    if (!notifGranted) {
      showTimedToast(t.notificationsBlockedWarn);
      await initializeAlarmNotifications();
      const after = await checkNotificationPermissions();
      setNotifGranted(after.granted);
      if (!after.granted && !after.canAskAgain) {
        void Linking.openSettings();
      }
      void refreshSafetyChecks();
      return;
    }

    if (!safetyStatus.canUseFullScreenIntent) {
      showTimedToast(t.safetyPermissionsNeeded);
      alarmSoundPlayer.openFullScreenIntentSettings();
      void refreshSafetyChecks();
      return;
    }

    if (isVolumeReduced) {
      const fixLabel = language === 'bn' ? 'বাড়ান' : 'TURN UP';
      showTimedToast(
        t.volumeLowWarn(safetyStatus.alarmVolumePercent),
        fixLabel,
        () => {
          void alarmSoundPlayer.raiseAlarmVolumeToSafeLevel().then(() => {
            void refreshSafetyChecks();
            useAlarmStore.getState().hideToast();
          });
        },
        4800
      );
      return;
    }

    if (isBatteryLow) {
      showTimedToast(t.batteryLowWarn(safetyStatus.batteryLevel));
      return;
    }

    showTimedToast(t.safetyAllSystemsGo, null, null, 3200);
  };

  const handleOpenSettings = () => {
    safeHaptics.selectionAsync();
    onOpenSettings?.();
  };

  const badgeBgColor =
    badgeStatus === 'healthy'
      ? 'rgba(16, 185, 129, 0.12)'
      : badgeStatus === 'warning'
        ? 'rgba(245, 158, 11, 0.15)'
        : 'rgba(239, 68, 68, 0.14)';

  const badgeBorderColor =
    badgeStatus === 'healthy'
      ? 'rgba(16, 185, 129, 0.35)'
      : badgeStatus === 'warning'
        ? 'rgba(245, 158, 11, 0.45)'
        : 'rgba(239, 68, 68, 0.40)';

  const accessibilityStatusLabel =
    badgeStatus === 'healthy'
      ? t.safetyAllSystemsGo
      : !isPermissionsReady
        ? t.safetyPermissionsNeeded
        : isVolumeReduced
          ? t.volumeLowWarn(safetyStatus.alarmVolumePercent)
          : t.batteryLowWarn(safetyStatus.batteryLevel);

  return (
    <View
      style={[
        styles.container,
        { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
      ]}
    >
      <View style={styles.leftRow}>
        <Text
          style={[
            styles.titleText,
            {
              color: colors.textPrimary,
              fontFamily: typography.numbersBold,
            },
          ]}
        >
          {t.appTitle}
        </Text>

        {intervalModeType === 'escalating' && (
          <View
            style={[
              styles.escalatingPill,
              {
                backgroundColor: colors.primaryMuted,
                borderColor: colors.primary + '55',
                borderRadius: radii.chip,
              },
            ]}
          >
            <Flame size={12} color={colors.primary} />
            <Text
              style={[
                styles.escalatingPillText,
                { color: colors.primaryLight, fontFamily: typography.sansBold },
              ]}
            >
              {t.escalatingBadge}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rightRow}>
        {enableSafetyCheckBanner && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => void handleSafetyBadgePress()}
            accessibilityLabel={accessibilityStatusLabel}
            style={[
              styles.iconBtn,
              {
                backgroundColor: badgeBgColor,
                borderColor: badgeBorderColor,
                borderRadius: radii.chip,
              },
            ]}
          >
            {badgeStatus === 'healthy' ? (
              <ShieldCheck size={18} color={colors.success} />
            ) : badgeStatus === 'warning' ? (
              <AlertTriangle size={18} color="#F59E0B" strokeWidth={2.3} />
            ) : (
              <X size={18} color={colors.danger} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        )}

        {onOpenSettings && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenSettings}
            accessibilityLabel={t.settingsTitle}
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.surfaceBorder,
                borderRadius: radii.chip,
              },
            ]}
          >
            <Settings size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 0,
  },
  titleText: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  escalatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderWidth: 1,
  },
  escalatingPillText: {
    fontSize: 10.5,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
