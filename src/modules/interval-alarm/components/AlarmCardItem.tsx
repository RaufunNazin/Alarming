import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../core/theme';
import { AlarmItem } from '../types';
import {
  formatAlarmTimeDisplay,
  getSmartScheduleString,
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

  const scheduleStr = getSmartScheduleString(alarm);
  const timeDisplay = formatAlarmTimeDisplay(alarm);
  const defaultLabel =
    alarm.type === 'interval'
      ? 'Morning Wakeup'
      : alarm.type === 'offset'
      ? 'Interval Wakeup'
      : 'Alarm';
  const labelDisplay = alarm.label.trim() || defaultLabel;

  return (
    <View style={{ marginHorizontal: spacing.lg, marginVertical: 6 }}>
      {/* Sibling touchable container: card editing on the left, squircle toggle on the right */}
      <View
        style={[
          styles.cardContainer,
          shadows.card,
          {
            backgroundColor: alarm.isEnabled ? colors.cardOnBg : colors.cardOffBg,
            borderColor: alarm.isEnabled ? colors.cardOnBorder : colors.cardOffBorder,
            borderRadius: radii.cardOuter,
            paddingVertical: 18,
            paddingHorizontal: 18,
            opacity: alarm.isEnabled ? 1 : 0.6,
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
            {/* Top row: Today/Tomorrow / Sun-Thu • Label (wraps if long) */}
            <View style={styles.topInfoRow}>
              <Text
                style={[
                  styles.scheduleText,
                  {
                    color: alarm.isEnabled ? colors.textPrimary : colors.textMuted,
                    fontFamily: typography.numbersBold,
                  },
                ]}
              >
                {scheduleStr}
              </Text>
              <Text
                style={[
                  styles.separatorDot,
                  { color: colors.textMuted },
                ]}
              >
                •
              </Text>
              <Text
                style={[
                  styles.labelText,
                  {
                    color: alarm.isEnabled ? colors.textSecondary : colors.textMuted,
                    fontFamily: typography.numbersRegular,
                  },
                ]}
                numberOfLines={2}
              >
                {labelDisplay}
              </Text>
            </View>

            {/* Time Display (Uniform sizing across all alarm types) */}
            <Text
              style={[
                styles.largeTimeText,
                {
                  fontSize: 22,
                  lineHeight: 28,
                  color: alarm.isEnabled ? colors.textPrimary : colors.textMuted,
                  fontFamily: typography.numbersBold,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {timeDisplay}
            </Text>
          </TouchableOpacity>

          {/* Right Sibling: Squircle Toggle Button */}
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
    paddingRight: 14,
  },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  separatorDot: {
    marginHorizontal: 6,
    fontSize: 13,
  },
  labelText: {
    fontSize: 13,
    flexShrink: 1,
  },
  largeTimeText: {
    letterSpacing: 0.2,
  },
  toggleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
