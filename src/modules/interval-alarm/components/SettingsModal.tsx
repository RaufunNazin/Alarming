import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import {
  X,
  Moon,
  Sun,
  Globe,
  Flame,
  Sliders,
  ChevronRight,
  Check,
  RotateCcw,
  Minus,
  Plus,
  ShieldCheck,
  Volume2,
  Tag,
} from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import {
  useSettingsStore,
  IntervalModeType,
  VolumeButtonAction,
} from '../../../core/settings/settingsStore';
import { useTranslation } from '../../../core/i18n/translations';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const EARLY_DISMISS_WINDOWS = [15, 30, 45, 60];
const SNOOZE_PRESETS = [5, 10, 15];

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const { colors, typography, radii, shadows, themeMode } = useTheme();
  const { t, formatNum } = useTranslation();

  const settings = useSettingsStore();
  const { updateSettings, addCategory, removeCategory, resetSettings } = settings;

  const isLight = themeMode === 'light';
  const sheetBg = isLight ? colors.background : colors.surface;
  const cardBg = isLight ? colors.cardOnBg : colors.surfaceSubtle;
  const controlBg = isLight ? colors.surfaceSubtle : colors.surface;

  const [alarmTypeModalVisible, setAlarmTypeModalVisible] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const handleSelectAlarmType = (mode: IntervalModeType) => {
    safeHaptics.selectionAsync();
    void updateSettings({ intervalModeType: mode });
    setAlarmTypeModalVisible(false);
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    safeHaptics.selectionAsync();
    void addCategory(trimmed);
    setNewCategoryInput('');
  };

  const renderSquircleToggle = (value: boolean, onToggle: (next: boolean) => void) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        safeHaptics.selectionAsync();
        onToggle(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={[
        styles.squircleSwitchTrack,
        {
          backgroundColor: value ? colors.primary : controlBg,
          borderColor: value ? colors.primary : colors.surfaceBorder,
          borderRadius: radii.chip,
        },
      ]}
    >
      <View
        style={[
          styles.squircleSwitchThumb,
          {
            backgroundColor: value ? '#FFFFFF' : colors.textMuted,
            transform: [{ translateX: value ? 20 : 0 }],
          },
        ]}
      />
    </TouchableOpacity>
  );

  const volumeActions: { key: VolumeButtonAction; label: string }[] = [
    { key: 'snooze', label: t.volumeActionSnooze },
    { key: 'dismiss', label: t.volumeActionDismiss },
    { key: 'none', label: t.volumeActionNone },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.overlayBackdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            shadows.modal,
            {
              backgroundColor: sheetBg,
              borderColor: colors.surfaceBorder,
              borderRadius: radii.card,
            },
          ]}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Text
              style={[
                styles.sheetTitle,
                { color: colors.textPrimary, fontFamily: typography.sansBold },
              ]}
            >
              {t.settingsTitle}
            </Text>
            <TouchableOpacity
              onPress={() => {
                safeHaptics.selectionAsync();
                onClose();
              }}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: cardBg,
                  borderColor: colors.surfaceBorder,
                  borderWidth: isLight ? 1 : 0,
                  borderRadius: radii.pill,
                },
              ]}
            >
              <X size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 1. APPEARANCE & LANGUAGE */}
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.textSecondary, fontFamily: typography.sansBold },
              ]}
            >
              {t.sectionAppearance}
            </Text>
            <View
              style={[
                styles.cardGroup,
                {
                  backgroundColor: cardBg,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              {/* Theme Switcher */}
              <View style={styles.rowItem}>
                <View style={styles.rowLabelWithIcon}>
                  {settings.themeMode === 'dark' ? (
                    <Moon size={18} color={colors.primary} />
                  ) : (
                    <Sun size={18} color={colors.primary} />
                  )}
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {t.themeLabel}
                  </Text>
                </View>

                <View
                  style={[
                    styles.segmentedPill,
                    {
                      backgroundColor: controlBg,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.button,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({ themeMode: 'dark' });
                    }}
                    style={[
                      styles.segmentOption,
                      settings.themeMode === 'dark' && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentOptionText,
                        {
                          color:
                            settings.themeMode === 'dark'
                              ? '#FFFFFF'
                              : colors.textSecondary,
                          fontFamily: typography.sansMedium,
                        },
                      ]}
                    >
                      {t.themeDark}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({ themeMode: 'light' });
                    }}
                    style={[
                      styles.segmentOption,
                      settings.themeMode === 'light' && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentOptionText,
                        {
                          color:
                            settings.themeMode === 'light'
                              ? '#FFFFFF'
                              : colors.textSecondary,
                          fontFamily: typography.sansMedium,
                        },
                      ]}
                    >
                      {t.themeLight}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Language Switcher */}
              <View style={styles.rowItem}>
                <View style={styles.rowLabelWithIcon}>
                  <Globe size={18} color={colors.primary} />
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {t.languageLabel}
                  </Text>
                </View>

                <View
                  style={[
                    styles.segmentedPill,
                    {
                      backgroundColor: controlBg,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.button,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({ language: 'en' });
                    }}
                    style={[
                      styles.segmentOption,
                      settings.language === 'en' && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentOptionText,
                        {
                          color:
                            settings.language === 'en'
                              ? '#FFFFFF'
                              : colors.textSecondary,
                          fontFamily: typography.sansMedium,
                        },
                      ]}
                    >
                      {t.langEnglish}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({ language: 'bn' });
                    }}
                    style={[
                      styles.segmentOption,
                      settings.language === 'bn' && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentOptionText,
                        {
                          color:
                            settings.language === 'bn'
                              ? '#FFFFFF'
                              : colors.textSecondary,
                          fontFamily: typography.sansMedium,
                        },
                      ]}
                    >
                      {t.langBangla}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 2. SAFETY, SLEEP CHECKS & HARDWARE BUTTONS */}
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.textSecondary, fontFamily: typography.sansBold },
              ]}
            >
              {t.sectionSafetyAndHardware}
            </Text>
            <View
              style={[
                styles.cardGroup,
                {
                  backgroundColor: cardBg,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              {/* Pre-Sleep Safety Check Banner Toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <View style={styles.rowLabelWithIcon}>
                    <ShieldCheck size={16} color={colors.accent} />
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.toggleSafetyCheckTitle}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.rowDesc,
                      { color: colors.textSecondary, fontFamily: typography.sansRegular },
                    ]}
                  >
                    {t.toggleSafetyCheckDesc}
                  </Text>
                </View>
                {renderSquircleToggle(settings.enableSafetyCheckBanner, (val) =>
                  void updateSettings({ enableSafetyCheckBanner: val })
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Hardware Volume Buttons Configuration */}
              <View style={styles.columnItem}>
                <View style={styles.rowLabelWithIcon}>
                  <Volume2 size={16} color={colors.accent} />
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {t.volumeButtonActionLabel}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rowDesc,
                    { color: colors.textSecondary, fontFamily: typography.sansRegular },
                  ]}
                >
                  {t.volumeButtonActionDesc}
                </Text>

                <View style={styles.chipsRow}>
                  {volumeActions.map((opt) => {
                    const isSelected = settings.volumeButtonAction === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        activeOpacity={0.8}
                        onPress={() => {
                          safeHaptics.selectionAsync();
                          void updateSettings({ volumeButtonAction: opt.key });
                        }}
                        style={[
                          styles.choiceChip,
                          {
                            backgroundColor: isSelected
                              ? colors.accent
                              : controlBg,
                            borderColor: isSelected
                              ? colors.accent
                              : colors.surfaceBorder,
                            borderRadius: radii.button,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceChipText,
                            {
                              color: isSelected ? '#FFFFFF' : colors.textSecondary,
                              fontFamily: isSelected
                                ? typography.sansBold
                                : typography.sansMedium,
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Early Dismissal ("I'm Already Awake") Window */}
              <View style={styles.columnItem}>
                <Text
                  style={[
                    styles.rowTitle,
                    { color: colors.textPrimary, fontFamily: typography.sansMedium },
                  ]}
                >
                  {t.earlyDismissWindowLabel}
                </Text>
                <Text
                  style={[
                    styles.rowDesc,
                    { color: colors.textSecondary, fontFamily: typography.sansRegular },
                  ]}
                >
                  {t.earlyDismissWindowDesc}
                </Text>

                <View style={styles.chipsRow}>
                  {EARLY_DISMISS_WINDOWS.map((mins) => {
                    const isSelected = settings.earlyDismissalWindowMinutes === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        activeOpacity={0.8}
                        onPress={() => {
                          safeHaptics.selectionAsync();
                          void updateSettings({ earlyDismissalWindowMinutes: mins });
                        }}
                        style={[
                          styles.choiceChip,
                          {
                            backgroundColor: isSelected
                              ? colors.accent
                              : controlBg,
                            borderColor: isSelected
                              ? colors.accent
                              : colors.surfaceBorder,
                            borderRadius: radii.button,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceChipText,
                            {
                              color: isSelected ? '#FFFFFF' : colors.textSecondary,
                              fontFamily: isSelected
                                ? typography.numbersBold
                                : typography.sansMedium,
                            },
                          ]}
                        >
                          {t.nMin(mins)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 3. CATEGORIES MANAGEMENT */}
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.textSecondary, fontFamily: typography.sansBold },
              ]}
            >
              {t.sectionCategories}
            </Text>
            <View
              style={[
                styles.cardGroup,
                {
                  backgroundColor: cardBg,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                  padding: 14,
                },
              ]}
            >
              <Text
                style={[
                  styles.rowDesc,
                  {
                    color: colors.textSecondary,
                    fontFamily: typography.sansRegular,
                    marginTop: 0,
                    marginBottom: 10,
                  },
                ]}
              >
                {t.manageCategoriesDesc}
              </Text>

              <View style={styles.categoryWrapRow}>
                {settings.categories.map((cat) => (
                  <View
                    key={cat}
                    style={[
                      styles.categoryManageTag,
                      {
                        backgroundColor: controlBg,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.pill,
                      },
                    ]}
                  >
                    <Tag size={11} color={colors.accent} />
                    <Text
                      style={[
                        styles.categoryManageText,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {cat}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        safeHaptics.selectionAsync();
                        void removeCategory(cat);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <X size={13} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.addCategoryInputRow}>
                <TextInput
                  value={newCategoryInput}
                  onChangeText={setNewCategoryInput}
                  placeholder={t.addCategoryPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={handleAddCategory}
                  style={[
                    styles.addCategoryInput,
                    {
                      backgroundColor: controlBg,
                      borderColor: colors.surfaceBorder,
                      color: colors.textPrimary,
                      borderRadius: radii.button,
                      fontFamily: typography.sansRegular,
                    },
                  ]}
                />
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleAddCategory}
                  style={[
                    styles.addCategoryBtn,
                    {
                      backgroundColor: colors.accent,
                      borderRadius: radii.button,
                    },
                  ]}
                >
                  <Plus size={15} color="#FFFFFF" />
                  <Text
                    style={[
                      styles.addCategoryBtnText,
                      { color: '#FFFFFF', fontFamily: typography.sansBold },
                    ]}
                  >
                    {t.addCategoryBtn}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. INTERVAL ALARM SYSTEM (WITH MODAL SELECTOR) */}
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.textSecondary, fontFamily: typography.sansBold },
              ]}
            >
              {t.sectionAlarmType}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                safeHaptics.selectionAsync();
                setAlarmTypeModalVisible(true);
              }}
              style={[
                styles.alarmTypeSelectorCard,
                {
                  backgroundColor: cardBg,
                  borderColor:
                    settings.intervalModeType === 'escalating'
                      ? colors.primary
                      : colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              <View style={styles.alarmTypeLeft}>
                <View
                  style={[
                    styles.alarmTypeIconBox,
                    { backgroundColor: colors.primaryMuted },
                  ]}
                >
                  {settings.intervalModeType === 'escalating' ? (
                    <Flame size={20} color={colors.primary} />
                  ) : (
                    <Sliders size={20} color={colors.primary} />
                  )}
                </View>
                <View style={styles.alarmTypeTextCol}>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansBold },
                    ]}
                  >
                    {t.intervalAlarmTypeLabel}
                  </Text>
                  <Text
                    style={[
                      styles.alarmTypeSubText,
                      { color: colors.primaryLight, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {settings.intervalModeType === 'escalating'
                      ? t.typeEscalatingTitle
                      : t.typeStandardTitle}
                  </Text>
                  <Text
                    style={[
                      styles.rowDesc,
                      { color: colors.textSecondary, fontFamily: typography.sansRegular },
                    ]}
                  >
                    {settings.intervalModeType === 'escalating'
                      ? t.typeEscalatingDesc
                      : t.typeStandardDesc}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* 5. DEFAULT TIMES & STEPS */}
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.textSecondary, fontFamily: typography.sansBold },
              ]}
            >
              {t.sectionDefaults}
            </Text>
            <View
              style={[
                styles.cardGroup,
                {
                  backgroundColor: cardBg,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              {/* Default Snooze Time with Quick Presets (5m, 10m, 15m) + Stepper */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {t.defaultSnoozeLabel}
                  </Text>
                  <View style={styles.stepperGroup}>
                    <TouchableOpacity
                      onPress={() => {
                        safeHaptics.selectionAsync();
                        void updateSettings({
                          defaultSnoozeMinutes: Math.max(
                            1,
                            settings.defaultSnoozeMinutes - 1
                          ),
                        });
                      }}
                      style={[styles.stepBtn, { backgroundColor: controlBg }]}
                    >
                      <Minus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.stepValText,
                        { color: colors.textPrimary, fontFamily: typography.numbersBold },
                      ]}
                    >
                      {t.nMin(settings.defaultSnoozeMinutes)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        safeHaptics.selectionAsync();
                        void updateSettings({
                          defaultSnoozeMinutes: Math.min(
                            60,
                            settings.defaultSnoozeMinutes + 1
                          ),
                        });
                      }}
                      style={[styles.stepBtn, { backgroundColor: controlBg }]}
                    >
                      <Plus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.chipsRow}>
                  {SNOOZE_PRESETS.map((mins) => {
                    const isSelected = settings.defaultSnoozeMinutes === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        activeOpacity={0.8}
                        onPress={() => {
                          safeHaptics.selectionAsync();
                          void updateSettings({ defaultSnoozeMinutes: mins });
                        }}
                        style={[
                          styles.choiceChip,
                          {
                            backgroundColor: isSelected
                              ? colors.accent
                              : controlBg,
                            borderColor: isSelected
                              ? colors.accent
                              : colors.surfaceBorder,
                            borderRadius: radii.button,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceChipText,
                            {
                              color: isSelected ? '#FFFFFF' : colors.textSecondary,
                              fontFamily: isSelected
                                ? typography.numbersBold
                                : typography.sansMedium,
                            },
                          ]}
                        >
                          {t.nMin(mins)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Default Interval Minutes (disabled when escalating is active) */}
              <View
                style={[
                  styles.rowItem,
                  settings.intervalModeType === 'escalating' && { opacity: 0.45 },
                ]}
              >
                <Text
                  style={[
                    styles.rowTitle,
                    { color: colors.textPrimary, fontFamily: typography.sansMedium },
                  ]}
                >
                  {t.defaultIntervalLabel}
                </Text>
                <View style={styles.stepperGroup}>
                  <TouchableOpacity
                    disabled={settings.intervalModeType === 'escalating'}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({
                        defaultIntervalMinutes: Math.max(
                          1,
                          settings.defaultIntervalMinutes - 1
                        ),
                      });
                    }}
                    style={[styles.stepBtn, { backgroundColor: controlBg }]}
                  >
                    <Minus size={14} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.stepValText,
                      { color: colors.textPrimary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    {t.nMin(settings.defaultIntervalMinutes)}
                  </Text>
                  <TouchableOpacity
                    disabled={settings.intervalModeType === 'escalating'}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({
                        defaultIntervalMinutes: Math.min(
                          60,
                          settings.defaultIntervalMinutes + 1
                        ),
                      });
                    }}
                    style={[styles.stepBtn, { backgroundColor: controlBg }]}
                  >
                    <Plus size={14} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Default Steps Count (disabled when escalating is active) */}
              <View
                style={[
                  styles.rowItem,
                  settings.intervalModeType === 'escalating' && { opacity: 0.45 },
                ]}
              >
                <Text
                  style={[
                    styles.rowTitle,
                    { color: colors.textPrimary, fontFamily: typography.sansMedium },
                  ]}
                >
                  {t.defaultStepsLabel}
                </Text>
                <View style={styles.stepperGroup}>
                  <TouchableOpacity
                    disabled={settings.intervalModeType === 'escalating'}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({
                        defaultAlarmCount: Math.max(2, settings.defaultAlarmCount - 1),
                      });
                    }}
                    style={[styles.stepBtn, { backgroundColor: controlBg }]}
                  >
                    <Minus size={14} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.stepValText,
                      { color: colors.textPrimary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    {formatNum(settings.defaultAlarmCount)}
                  </Text>
                  <TouchableOpacity
                    disabled={settings.intervalModeType === 'escalating'}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({
                        defaultAlarmCount: Math.min(30, settings.defaultAlarmCount + 1),
                      });
                    }}
                    style={[styles.stepBtn, { backgroundColor: controlBg }]}
                  >
                    <Plus size={14} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Default Window Duration */}
              <View style={styles.rowItem}>
                <Text
                  style={[
                    styles.rowTitle,
                    { color: colors.textPrimary, fontFamily: typography.sansMedium },
                  ]}
                >
                  {t.defaultWindowDurationLabel}
                </Text>
                <View style={styles.stepperGroup}>
                  <TouchableOpacity
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({
                        defaultWindowDurationMinutes: Math.max(
                          15,
                          settings.defaultWindowDurationMinutes - 15
                        ),
                      });
                    }}
                    style={[styles.stepBtn, { backgroundColor: controlBg }]}
                  >
                    <Minus size={14} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.stepValText,
                      { color: colors.textPrimary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    {t.nMin(settings.defaultWindowDurationMinutes)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({
                        defaultWindowDurationMinutes: Math.min(
                          240,
                          settings.defaultWindowDurationMinutes + 15
                        ),
                      });
                    }}
                    style={[styles.stepBtn, { backgroundColor: controlBg }]}
                  >
                    <Plus size={14} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Default Offset Direction */}
              <View style={styles.rowItem}>
                <Text
                  style={[
                    styles.rowTitle,
                    { color: colors.textPrimary, fontFamily: typography.sansMedium },
                  ]}
                >
                  {t.defaultDirectionLabel}
                </Text>
                <View
                  style={[
                    styles.segmentedPill,
                    {
                      backgroundColor: controlBg,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.button,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({ defaultOffsetDirection: 'before' });
                    }}
                    style={[
                      styles.segmentOption,
                      settings.defaultOffsetDirection === 'before' && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentOptionText,
                        {
                          color:
                            settings.defaultOffsetDirection === 'before'
                              ? '#FFFFFF'
                              : colors.textSecondary,
                          fontFamily: typography.sansMedium,
                        },
                      ]}
                    >
                      {t.before}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({ defaultOffsetDirection: 'after' });
                    }}
                    style={[
                      styles.segmentOption,
                      settings.defaultOffsetDirection === 'after' && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.segmentOptionText,
                        {
                          color:
                            settings.defaultOffsetDirection === 'after'
                              ? '#FFFFFF'
                              : colors.textSecondary,
                          fontFamily: typography.sansMedium,
                        },
                      ]}
                    >
                      {t.after}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Default Power Nap Duration */}
              <View style={styles.rowItem}>
                <Text
                  style={[
                    styles.rowTitle,
                    { color: colors.textPrimary, fontFamily: typography.sansMedium },
                  ]}
                >
                  {t.defaultPowerNapLabel}
                </Text>
                <View style={styles.stepperGroup}>
                  <TouchableOpacity
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({
                        defaultPowerNapMinutes: Math.max(
                          5,
                          settings.defaultPowerNapMinutes - 5
                        ),
                      });
                    }}
                    style={[styles.stepBtn, { backgroundColor: controlBg }]}
                  >
                    <Minus size={14} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.stepValText,
                      { color: colors.textPrimary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    {t.nMin(settings.defaultPowerNapMinutes)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      void updateSettings({
                        defaultPowerNapMinutes: Math.min(
                          180,
                          settings.defaultPowerNapMinutes + 5
                        ),
                      });
                    }}
                    style={[styles.stepBtn, { backgroundColor: controlBg }]}
                  >
                    <Plus size={14} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 6. FEATURE TOGGLES & SIMPLICITY */}
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.textSecondary, fontFamily: typography.sansBold },
              ]}
            >
              {t.sectionFeatures}
            </Text>
            <View
              style={[
                styles.cardGroup,
                {
                  backgroundColor: cardBg,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              {/* Show Alarm Sequence Section */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {t.toggleSequenceTitle}
                  </Text>
                  <Text
                    style={[
                      styles.rowDesc,
                      { color: colors.textSecondary, fontFamily: typography.sansRegular },
                    ]}
                  >
                    {t.toggleSequenceDesc}
                  </Text>
                </View>
                {renderSquircleToggle(settings.showAlarmSequenceSection, (val) =>
                  void updateSettings({ showAlarmSequenceSection: val })
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Show Advanced Creation Controls */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {t.toggleCreationControlsTitle}
                  </Text>
                  <Text
                    style={[
                      styles.rowDesc,
                      { color: colors.textSecondary, fontFamily: typography.sansRegular },
                    ]}
                  >
                    {t.toggleCreationControlsDesc}
                  </Text>
                </View>
                {renderSquircleToggle(settings.showCreationAdvancedControls, (val) =>
                  void updateSettings({ showCreationAdvancedControls: val })
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Show Power Nap Button */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {t.togglePowerNapTitle}
                  </Text>
                  <Text
                    style={[
                      styles.rowDesc,
                      { color: colors.textSecondary, fontFamily: typography.sansRegular },
                    ]}
                  >
                    {t.togglePowerNapDesc}
                  </Text>
                </View>
                {renderSquircleToggle(settings.showPowerNapButton, (val) =>
                  void updateSettings({ showPowerNapButton: val })
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Show Confirmation Toasts */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {t.toggleToastsTitle}
                  </Text>
                  <Text
                    style={[
                      styles.rowDesc,
                      { color: colors.textSecondary, fontFamily: typography.sansRegular },
                    ]}
                  >
                    {t.toggleToastsDesc}
                  </Text>
                </View>
                {renderSquircleToggle(settings.showToastBanners, (val) =>
                  void updateSettings({ showToastBanners: val })
                )}
              </View>
            </View>

            {/* Reset Settings Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                safeHaptics.notificationAsync(
                  safeHaptics.NotificationFeedbackType.Warning
                );
                void resetSettings();
              }}
              style={[
                styles.resetBtn,
                {
                  backgroundColor: cardBg,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              <RotateCcw size={16} color={colors.danger} />
              <Text
                style={[
                  styles.resetBtnText,
                  { color: colors.danger, fontFamily: typography.sansMedium },
                ]}
              >
                {t.resetSettingsBtn}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Dedicated Modal for Interval Alarm Type Selection */}
      <Modal
        visible={alarmTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAlarmTypeModalVisible(false)}
      >
        <View style={[styles.subModalBackdrop, { backgroundColor: colors.overlayBackdrop }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setAlarmTypeModalVisible(false)}
          />
          <View
            style={[
              styles.subModalCard,
              shadows.modal,
              {
                backgroundColor: isLight ? colors.cardOnBg : colors.surface,
                borderColor: colors.surfaceBorder,
                borderRadius: radii.card,
              },
            ]}
          >
            <View style={styles.topBar}>
              <Text
                style={[
                  styles.subModalTitle,
                  { color: colors.textPrimary, fontFamily: typography.sansBold },
                ]}
              >
                {t.selectAlarmTypeModalTitle}
              </Text>
              <TouchableOpacity
                onPress={() => setAlarmTypeModalVisible(false)}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <X size={16} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.subModalDesc,
                { color: colors.textSecondary, fontFamily: typography.sansRegular },
              ]}
            >
              {t.selectAlarmTypeModalDesc}
            </Text>

            {/* Option 1: Standard Interval & Steps */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSelectAlarmType('standard')}
              style={[
                styles.optionCard,
                {
                  backgroundColor:
                    settings.intervalModeType === 'standard'
                      ? colors.primaryMuted
                      : colors.surfaceSubtle,
                  borderColor:
                    settings.intervalModeType === 'standard'
                      ? colors.primary
                      : colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionTitleRow}>
                  <Sliders
                    size={18}
                    color={
                      settings.intervalModeType === 'standard'
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansBold },
                    ]}
                  >
                    {t.typeStandardTitle}
                  </Text>
                </View>
                {settings.intervalModeType === 'standard' && (
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Check size={14} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.optionDesc,
                  { color: colors.textSecondary, fontFamily: typography.sansRegular },
                ]}
              >
                {t.typeStandardDesc}
              </Text>
            </TouchableOpacity>

            {/* Option 2: Escalating Interval Alarm */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleSelectAlarmType('escalating')}
              style={[
                styles.optionCard,
                {
                  backgroundColor:
                    settings.intervalModeType === 'escalating'
                      ? colors.primaryMuted
                      : colors.surfaceSubtle,
                  borderColor:
                    settings.intervalModeType === 'escalating'
                      ? colors.primary
                      : colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionTitleRow}>
                  <Flame
                    size={18}
                    color={
                      settings.intervalModeType === 'escalating'
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansBold },
                    ]}
                  >
                    {t.typeEscalatingTitle}
                  </Text>
                </View>
                {settings.intervalModeType === 'escalating' && (
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Check size={14} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.optionDesc,
                  { color: colors.textSecondary, fontFamily: typography.sansRegular },
                ]}
              >
                {t.typeEscalatingDesc}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 22,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardGroup: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  columnItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    fontSize: 14,
  },
  rowDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  segmentedPill: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 2,
  },
  segmentOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  segmentOptionText: {
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  choiceChip: {
    flex: 1,
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceChipText: {
    fontSize: 12.5,
  },
  categoryWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryManageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  categoryManageText: {
    fontSize: 12,
  },
  addCategoryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addCategoryInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  addCategoryBtnText: {
    fontSize: 12.5,
  },
  squircleSwitchTrack: {
    width: 48,
    height: 28,
    borderWidth: 1,
    padding: 3,
    justifyContent: 'center',
  },
  squircleSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 7,
  },
  alarmTypeSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    padding: 14,
  },
  alarmTypeLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginRight: 8,
  },
  alarmTypeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  alarmTypeTextCol: {
    flex: 1,
  },
  alarmTypeSubText: {
    fontSize: 13,
    marginTop: 2,
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepValText: {
    fontSize: 14,
    minWidth: 56,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  toggleTextCol: {
    flex: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 18,
    gap: 8,
  },
  resetBtnText: {
    fontSize: 14,
  },
  subModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subModalCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    padding: 20,
  },
  subModalTitle: {
    fontSize: 18,
    flex: 1,
    marginRight: 10,
  },
  subModalDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  optionCard: {
    borderWidth: 1.5,
    padding: 15,
    marginBottom: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
