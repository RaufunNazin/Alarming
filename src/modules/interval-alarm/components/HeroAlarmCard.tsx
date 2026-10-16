import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, Repeat, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { AlarmItem } from '../types';
import {
  formatTime12h,
  formatRepeatDays,
  generateIntervalSequence,
} from '../engine/intervalEngine';
import { SquircleToggleButton } from './SquircleToggleButton';

interface HeroAlarmCardProps {
  alarm: AlarmItem;
  countdownText: string;
  onPressCard: () => void;
  onToggle: () => void;
}

export const HeroAlarmCard: React.FC<HeroAlarmCardProps> = ({
  alarm,
  countdownText,
  onPressCard,
  onToggle,
}) => {
  const { colors, typography, radii, shadows, spacing } = useTheme();

  const isInterval = alarm.type === 'interval';
  const timeDisplay = isInterval
    ? `${formatTime12h(alarm.startHour, alarm.startMinute)} – ${formatTime12h(
        alarm.endHour ?? alarm.startHour,
        alarm.endMinute ?? alarm.startMinute
      )}`
    : formatTime12h(alarm.startHour, alarm.startMinute);

  const stepsCount = isInterval
    ? generateIntervalSequence(
        alarm.startHour,
        alarm.startMinute,
        alarm.endHour ?? alarm.startHour,
        alarm.endMinute ?? alarm.startMinute,
        alarm.intervalMinutes ?? 10
      ).length
    : 1;

  const repeatStr = formatRepeatDays(alarm.repeatDays);

  return (
    <View style={{ marginHorizontal: spacing.lg, marginVertical: spacing.sm }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPressCard}
        style={[
          styles.card,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
            borderRadius: radii.cardOuter,
            padding: spacing.lg,
          },
        ]}
      >
        <View style={styles.contentRow}>
          {/* Left Info Column */}
          <View style={styles.infoCol}>
            {/* Live Google Countdown Badge */}
            <View style={styles.countdownBadge}>
              <Sparkles size={13} color={colors.accentGold} strokeWidth={2.4} />
              <Text
                style={[
                  styles.countdownText,
                  {
                    color: colors.accentGold,
                    fontFamily: typography.numbersBold,
                  },
                ]}
              >
                {countdownText}
              </Text>
            </View>

            {/* Time Display */}
            <Text
              style={[
                styles.timeText,
                {
                  color: colors.textPrimary,
                  fontFamily: typography.numbersBold,
                  fontSize: isInterval ? 26 : 38,
                },
              ]}
              numberOfLines={1}
            >
              {timeDisplay}
            </Text>

            {/* Label */}
            <Text
              style={[
                styles.label,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.cursive,
                },
              ]}
              numberOfLines={1}
            >
              {alarm.label || (isInterval ? 'Morning Wakeup' : 'Alarm')}
            </Text>

            {/* Meta Row: Interval info & Repeat */}
            <View style={styles.metaRow}>
              {isInterval && (
                <View
                  style={[
                    styles.metaChip,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.chip,
                    },
                  ]}
                >
                  <Clock size={12} color={colors.primary} strokeWidth={2.2} />
                  <Text
                    style={[
                      styles.metaChipText,
                      { color: colors.textPrimary, fontFamily: typography.numbersRegular },
                    ]}
                  >
                    Every {alarm.intervalMinutes}m • {stepsCount} alarms
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.metaChip,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radii.chip,
                  },
                ]}
              >
                <Repeat size={12} color={colors.textSecondary} strokeWidth={2.2} />
                <Text
                  style={[
                    styles.metaChipText,
                    { color: colors.textSecondary, fontFamily: typography.numbersRegular },
                  ]}
                >
                  {repeatStr}
                </Text>
              </View>
            </View>
          </View>

          {/* Right Squircle Toggle Button (54x54px isolated) */}
          <View style={styles.toggleWrapper}>
            <SquircleToggleButton isEnabled={alarm.isEnabled} onToggle={onToggle} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    paddingRight: 12,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  countdownText: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  timeText: {
    lineHeight: 40,
    marginBottom: 2,
  },
  label: {
    fontSize: 22,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  metaChipText: {
    fontSize: 11,
  },
  toggleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
