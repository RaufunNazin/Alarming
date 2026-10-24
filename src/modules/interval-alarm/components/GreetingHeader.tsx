import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState } from 'react-native';
import { Settings, Flame, Clock } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { formatTime12hLocalized, useTranslation } from '../../../core/i18n/translations';
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { useAlarmStore } from '../store/alarmStore';
import { findNextUpcomingAlarm, getCompactCountdownText } from '../engine/intervalEngine';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

interface GreetingHeaderProps {
  onOpenSettings?: () => void;
}

export const GreetingHeader: React.FC<GreetingHeaderProps> = React.memo(function GreetingHeader({
  onOpenSettings,
}) {
  const { colors, typography, spacing, radii } = useTheme();
  const { t, language } = useTranslation();
  const intervalModeType = useSettingsStore((s) => s.intervalModeType);
  const alarms = useAlarmStore((s) => s.alarms);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const syncClockIfMinuteChanged = () => {
      const next = new Date();
      setNow((prev) =>
        Math.floor(prev.getTime() / 60000) === Math.floor(next.getTime() / 60000)
          ? prev
          : next
      );
    };

    const timer = setInterval(syncClockIfMinuteChanged, 10000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncClockIfMinuteChanged();
      }
    });

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  const upcomingInfo = React.useMemo(() => {
    const next = findNextUpcomingAlarm(alarms, now);
    if (!next) return null;
    const compactCountdown = getCompactCountdownText(next.nextDate, now);
    const formattedTime = formatTime12hLocalized(
      next.nextDate.getHours(),
      next.nextDate.getMinutes(),
      language
    ).full;
    return `${t.nextAlarmPrefix}: ${compactCountdown} • ${formattedTime}`;
  }, [alarms, now, language, t.nextAlarmPrefix]);

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
                borderRadius: radii.pill,
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
        <View
          style={[
            styles.sleepCounterBadge,
            {
              backgroundColor: upcomingInfo ? colors.accentSoft : colors.surfaceSubtle,
              borderColor: upcomingInfo ? colors.accent + '35' : colors.surfaceBorder,
              borderRadius: radii.pill,
            },
          ]}
        >
          <Clock
            size={11}
            color={upcomingInfo ? colors.accent : colors.textSecondary}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.sleepCounterText,
              {
                color: upcomingInfo ? colors.accent : colors.textSecondary,
                fontFamily: upcomingInfo ? typography.numbersBold : typography.sansMedium,
              },
            ]}
          >
            {upcomingInfo ?? t.noUpcomingAlarms}
          </Text>
        </View>

        {onOpenSettings && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenSettings}
            accessibilityLabel={t.settingsTitle}
            style={[
              styles.settingsBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.surfaceBorder,
                borderRadius: radii.pill,
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
    flexShrink: 1,
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
  sleepCounterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    flexShrink: 1,
  },
  sleepCounterText: {
    fontSize: 11,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
