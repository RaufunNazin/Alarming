import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, Repeat } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { AlarmItem } from '../types';
import {
  formatTime12h,
  formatRepeatDays,
  generateIntervalSequence,
} from '../engine/intervalEngine';
import { SquircleToggleButton } from './SquircleToggleButton';

interface AlarmCardItemProps {
  alarm: AlarmItem;
  onPressCard: () => void;
  onToggle: () => void;
}

export const AlarmCardItem: React.FC<AlarmCardItemProps> = ({
  alarm,
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
    <View style={{ marginHorizontal: spacing.lg, marginVertical: 5 }}>
      {/* Sibling container: Cleanly separates card editing tap from squircle toggle tap */}
      <View
        style={[
          styles.cardContainer,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
            borderRadius: radii.cardOuter,
            padding: spacing.md,
            opacity: alarm.isEnabled ? 1 : 0.65,
          },
        ]}
      >
        <View style={styles.contentRow}>
          {/* Left Info Column (Pressable to open Edit Modal) */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPressCard}
            style={styles.infoColPressable}
          >
            <Text
              style={[
                styles.timeText,
                {
                  color: alarm.isEnabled ? colors.textPrimary : colors.textMuted,
                  fontFamily: typography.numbersBold,
                  fontSize: isInterval ? 22 : 30,
                },
              ]}
              numberOfLines={1}
            >
              {timeDisplay}
            </Text>

            <Text
              style={[
                styles.label,
                {
                  color: alarm.isEnabled ? colors.textSecondary : colors.textMuted,
                  fontFamily: typography.cursive,
                },
              ]}
              numberOfLines={1}
            >
              {alarm.label || (isInterval ? 'Morning Wakeup' : 'Alarm')}
            </Text>

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
                  <Clock
                    size={11}
                    color={alarm.isEnabled ? colors.primary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.metaChipText,
                      {
                        color: alarm.isEnabled ? colors.textPrimary : colors.textMuted,
                        fontFamily: typography.numbersRegular,
                      },
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
                <Repeat size={11} color={colors.textMuted} strokeWidth={2} />
                <Text
                  style={[
                    styles.metaChipText,
                    { color: colors.textMuted, fontFamily: typography.numbersRegular },
                  ]}
                >
                  {repeatStr}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Right Sibling: Squircle Toggle Button (No awkward delete button below!) */}
          <View style={styles.toggleWrapper}>
            <SquircleToggleButton isEnabled={alarm.isEnabled} onToggle={onToggle} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoColPressable: {
    flex: 1,
    paddingRight: 10,
  },
  timeText: {
    lineHeight: 34,
    marginBottom: 2,
  },
  label: {
    fontSize: 20,
    marginBottom: 6,
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
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  metaChipText: {
    fontSize: 11,
  },
  toggleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
  },
});
