import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../core/theme';

export const GreetingHeader: React.FC = () => {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }]}>
      <Text
        style={[
          styles.greetingText,
          {
            color: colors.textPrimary,
            fontFamily: typography.cursive,
          },
        ]}
      >
        Good morning, my love
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
  greetingText: {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: 0.2,
  },
});
