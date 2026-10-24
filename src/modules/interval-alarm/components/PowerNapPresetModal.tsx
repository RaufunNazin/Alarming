import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Zap, X } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { useTranslation } from '../../../core/i18n/translations';
import { useAlarmStore } from '../store/alarmStore';

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

  const [selectedMinutes, setSelectedMinutes] = useState(defaultPowerNapMinutes);
  const [customText, setCustomText] = useState(String(defaultPowerNapMinutes));

  useEffect(() => {
    if (visible) {
      setSelectedMinutes(defaultPowerNapMinutes);
      setCustomText(String(defaultPowerNapMinutes));
    }
  }, [visible, defaultPowerNapMinutes]);

  const handleSelectChip = (mins: number) => {
    setSelectedMinutes(mins);
    setCustomText(String(mins));
  };

  const handleCustomTextChange = (text: string) => {
    const normalized = text
      .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
      .replace(/[^0-9]/g, '');
    setCustomText(normalized);
    const parsed = parseInt(normalized, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      const clamped = Math.min(240, parsed);
      setSelectedMinutes(clamped);
    }
  };

  const handleSavePreset = () => {
    const safeMinutes = Math.max(1, Math.min(240, selectedMinutes || 20));
    void updateSettings({ defaultPowerNapMinutes: safeMinutes });
    onClose();
  };

  const handleStartNow = () => {
    const safeMinutes = Math.max(1, Math.min(240, selectedMinutes || 20));
    void updateSettings({ defaultPowerNapMinutes: safeMinutes });
    void startPowerNap(safeMinutes);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.backdrop, { backgroundColor: colors.overlayBackdrop }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              borderRadius: radii.card,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: colors.primaryMuted },
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

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfaceSubtle, borderRadius: radii.pill },
              ]}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.descText,
              { color: colors.textSecondary, fontFamily: typography.sansRegular },
            ]}
          >
            {t.powerNapPresetDesc}
          </Text>

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

          {/* Custom Number Pad Input */}
          <View style={styles.customRow}>
            <Text
              style={[
                styles.customLabel,
                { color: colors.textSecondary, fontFamily: typography.sansMedium },
              ]}
            >
              {t.customDurationLabel}
            </Text>
            <View
              style={[
                styles.customInputBox,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              <TextInput
                value={customText}
                onChangeText={handleCustomTextChange}
                keyboardType="number-pad"
                maxLength={3}
                selectTextOnFocus
                style={[
                  styles.customInputText,
                  {
                    color: colors.textPrimary,
                    fontFamily: typography.numbersBold,
                  },
                ]}
              />
            </View>
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
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    padding: 22,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
  },
  closeBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 18,
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
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  customLabel: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  customInputBox: {
    width: 86,
    height: 44,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customInputText: {
    fontSize: 18,
    width: '100%',
    textAlign: 'center',
    padding: 0,
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
