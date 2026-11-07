import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Bell, BellOff } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';

interface SquircleToggleButtonProps {
  isEnabled: boolean;
  onToggle: () => void;
  size?: number;
}

export const SquircleToggleButton: React.FC<SquircleToggleButtonProps> = React.memo(function SquircleToggleButton({
  isEnabled,
  onToggle,
  size,
}) {
  const { colors, shadows, responsive } = useTheme();
  const effectiveSize = size ?? responsive.toggleSize;
  const effectiveRadius = Math.round(effectiveSize * 0.225);
  const bellOnSize = Math.round(effectiveSize * 0.43);
  const bellOffSize = Math.round(effectiveSize * 0.4);

  const handlePress = (e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
    onToggle();
  };

  const backgroundColor = isEnabled ? colors.squircleOnBg : colors.squircleOffBg;
  const borderColor = isEnabled ? colors.squircleBorderOn : colors.squircleBorder;
  const iconColor = isEnabled ? colors.squircleIconOn : colors.squircleIconOff;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[
        styles.squircle,
        shadows.squircle,
        {
          width: effectiveSize,
          height: effectiveSize,
          borderRadius: effectiveRadius,
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
        <Bell size={bellOnSize} color={iconColor} strokeWidth={2.3} />
      ) : (
        <BellOff size={bellOffSize} color={iconColor} strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  squircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
