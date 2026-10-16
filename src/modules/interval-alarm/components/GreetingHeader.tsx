import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../core/theme';

export const GreetingHeader: React.FC = () => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
      <Text
        style={[
          styles.titleText,
          {
            color: colors.textPrimary,
            fontFamily: typography.numbersBold,
          },
        ]}
      >
        Alarms
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
});
