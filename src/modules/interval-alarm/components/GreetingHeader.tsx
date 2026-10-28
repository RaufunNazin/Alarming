import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, Linking } from 'react-native';
import { Settings, Flame, ShieldCheck, X } from 'lucide-react-native';
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

export const GreetingHeader: React.FC<GreetingHeaderProps> = React.memo(function GreetingHeader({
  onOpenSettings,
}) {
  const { colors, typography, spacing, radii } = useTheme();
  const { t } = useTranslation();
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
  }, [enableSafetyCheckBanner, refreshSafetyChecks]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const isPermissionsReady = notifGranted && safetyStatus.canUseFullScreenIntent;

  const handleSafetyBadgePress = async () => {
    safeHaptics.selectionAsync();
    if (isPermissionsReady) {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      useAlarmStore.setState({
        toastMessage: t.safetyAllSystemsGo,
        toastActionLabel: null,
        onToastAction: null,
      });
      toastTimerRef.current = setTimeout(() => {
        useAlarmStore.setState({ toastMessage: null });
      }, 3200);
      return;
    }

    if (!notifGranted) {
      await initializeAlarmNotifications();
      const after = await checkNotificationPermissions();
      setNotifGranted(after.granted);
      if (!after.granted && !after.canAskAgain) {
        void Linking.openSettings();
      }
    } else if (!safetyStatus.canUseFullScreenIntent) {
      alarmSoundPlayer.openFullScreenIntentSettings();
    }
    void refreshSafetyChecks();
  };

  const handleOpenSettings = () => {
    safeHaptics.selectionAsync();
    onOpenSettings?.();
  };

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
            accessibilityLabel={
              isPermissionsReady ? t.safetyAllSystemsGo : t.safetyPermissionsNeeded
            }
            style={[
              styles.iconBtn,
              {
                backgroundColor: isPermissionsReady
                  ? 'rgba(16, 185, 129, 0.12)'
                  : 'rgba(239, 68, 68, 0.14)',
                borderColor: isPermissionsReady
                  ? 'rgba(16, 185, 129, 0.35)'
                  : 'rgba(239, 68, 68, 0.40)',
                borderRadius: radii.chip,
              },
            ]}
          >
            {isPermissionsReady ? (
              <ShieldCheck size={18} color={colors.success} />
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
