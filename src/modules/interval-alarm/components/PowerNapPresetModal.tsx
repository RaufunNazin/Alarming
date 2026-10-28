import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import { Zap } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { useTranslation } from '../../../core/i18n/translations';
import { useAlarmStore } from '../store/alarmStore';
import { useSheetModalGesture } from './useSheetModalGesture';

interface PowerNapPresetModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRESET_MINUTES = [10, 15, 20, 25, 30, 45, 60, 90];

export const PowerNapPresetModal: React.FC<PowerNapPresetModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, typography, radii } = useTheme();
  const { t, formatNum } = useTranslation();
  const defaultPowerNapMinutes = useSettingsStore((s) => s.defaultPowerNapMinutes);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const startPowerNap = useAlarmStore((s) => s.startPowerNap);
  const { translateY, dragHandlePanHandlers } = useSheetModalGesture(visible, onClose);

  const [selectedMinutes, setSelectedMinutes] = useState(defaultPowerNapMinutes);

  useEffect(() => {
    if (visible) {
      setSelectedMinutes(defaultPowerNapMinutes);
    }
  }, [visible, defaultPowerNapMinutes]);

  const handleSelectChip = (mins: number) => {
    setSelectedMinutes(mins);
  };

  const handleSavePreset = () => {
    const safeMinutes = Math.max(1, Math.min(240, selectedMinutes || 20));
    void updateSettings({ defaultPowerNapMinutes: safeMinutes });
    onClose();
  };

  const handleStartNow = () => {
    const safeMinutes = Math.max(1, Math.min(240, selectedMinutes || 20));
    void updateSettings({ defaultPowerNapMinutes: safeMinutes });
    void startPowerNap(safeMinutes, true);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.overlayBackdrop }]}>
        <Pressable style={styles.backdropDismissArea} onPress={onClose} />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              borderTopLeftRadius: radii.modalOuter,
              borderTopRightRadius: radii.modalOuter,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Drag Handle + Header */}
          <View {...dragHandlePanHandlers} style={styles.dragArea}>
            <View
              style={[
                styles.dragHandleBar,
                { backgroundColor: colors.surfaceBorder, borderRadius: radii.handle },
              ]}
            />
            <View style={styles.headerRow}>
              <View style={styles.titleRow}>
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: colors.primaryMuted, borderRadius: radii.chip },
                  ]}
                >
                  <Zap size={18} color={colors.primary} fill={colors.primary} />
                </View>
                <Text
                  style={[
                    styles.titleText,
                    { color: colors.textPrimary, fontFamily: typography.sansBold },
                  ]}
                >
                  {t.powerNapPresetTitle}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.descText,
                { color: colors.textSecondary, fontFamily: typography.sansRegular },
              ]}
            >
              {t.powerNapPresetDesc}
            </Text>
          </View>

          {/* Quick Presets */}
          <Text
            style={[
              styles.sectionLabel,
              { color: colors.textSecondary, fontFamily: typography.sansMedium },
            ]}
          >
            {t.quickPresetsLabel}
          </Text>

          <View style={styles.chipsGrid}>
            {PRESET_MINUTES.map((mins) => {
              const isSelected = selectedMinutes === mins;
              return (
                <TouchableOpacity
                  key={mins}
                  activeOpacity={0.8}
                  onPress={() => handleSelectChip(mins)}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : colors.surfaceSubtle,
                      borderColor: isSelected
                        ? colors.primaryLight
                        : colors.surfaceBorder,
                      borderRadius: radii.cardInner,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textPrimary,
                        fontFamily: typography.numbersBold,
                      },
                    ]}
                  >
                    {formatNum(mins)}m
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSavePreset}
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.button,
                },
              ]}
            >
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: colors.textPrimary, fontFamily: typography.sansMedium },
                ]}
              >
                {t.savePresetBtn}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleStartNow}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.button,
                },
              ]}
            >
              <Zap size={16} color="#FFFFFF" fill="#FFFFFF" />
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: '#FFFFFF', fontFamily: typography.sansBold },
                ]}
              >
                {t.startNapNowBtn(selectedMinutes)}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    borderTopWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
  },
  dragArea: {
    width: '100%',
  },
  dragHandleBar: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
  },
  descText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  chipBtn: {
    width: '23%',
    paddingVertical: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
  },
  primaryBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: {
    fontSize: 14,
  },
});
