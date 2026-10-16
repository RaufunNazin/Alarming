import React from 'react';
import { TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native';
import { Bell, BellOff } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';

interface SquircleToggleButtonProps {
  isEnabled: boolean;
  onToggle: () => void;
  size?: number;
}

export const SquircleToggleButton: React.FC<SquircleToggleButtonProps> = ({
  isEnabled,
  onToggle,
  size = 54,
}) => {
  const { colors, radii, shadows } = useTheme();

  const handlePress = (e: GestureResponderEvent) => {
    // Explicitly prevent bubbling to card body
    e.stopPropagation();
    Haptics.impactAsync(
      isEnabled
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );
    onToggle();
  };

  const backgroundColor = isEnabled ? colors.squircleOnBg : colors.squircleOffBg;
  const borderColor = isEnabled ? colors.squircleBorderOn : colors.squircleBorder;
  const iconColor = isEnabled ? colors.squircleIconOn : colors.squircleIconOff;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[
        styles.squircle,
        shadows.squircle,
        {
          width: size,
          height: size,
          borderRadius: radii.squircleToggle,
          backgroundColor,
          borderColor,
        },
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="switch"
      accessibilityState={{ checked: isEnabled }}
      accessibilityLabel={isEnabled ? 'Alarm enabled' : 'Alarm disabled'}
    >
      {isEnabled ? (
        <Bell size={24} color={iconColor} strokeWidth={2.4} />
      ) : (
        <BellOff size={22} color={iconColor} strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  squircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
});
