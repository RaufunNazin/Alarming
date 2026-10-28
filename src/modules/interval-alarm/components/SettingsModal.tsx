import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  TextInput,
  Animated,
  Platform,
  Linking,
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
  Code,
} from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import {
  useSettingsStore,
  IntervalModeType,
  VolumeButtonAction,
} from '../../../core/settings/settingsStore';
import { useTranslation } from '../../../core/i18n/translations';
import { useSheetModalGesture } from './useSheetModalGesture';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const EARLY_DISMISS_WINDOWS = [15, 30, 45, 60];
const SNOOZE_PRESETS = [5, 10, 15];
const PROJECT_GIT_URL = 'https://github.com/RaufunNazin/Alarming';
const useNativeDriver = Platform.OS !== 'web';

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
  const [activeTooltipKey, setActiveTooltipKey] = useState<string | null>(null);

  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justPressedHelpRef = useRef(false);

  const {
    translateY: sheetTranslateY,
    keyboardHeight,
    dragHandlePanHandlers,
  } = useSheetModalGesture(visible, onClose);

  const alarmTypeSheetGesture = useSheetModalGesture(
    alarmTypeModalVisible,
    () => setAlarmTypeModalVisible(false)
  );

  const clearTooltipTimer = useCallback(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  }, []);

  const dismissTooltip = useCallback(() => {
    clearTooltipTimer();
    setActiveTooltipKey(null);
  }, [clearTooltipTimer]);

  const toggleTooltip = useCallback(
    (key: string) => {
      safeHaptics.selectionAsync();
      clearTooltipTimer();

      if (activeTooltipKey === key) {
        setActiveTooltipKey(null);
        return;
      }

      tooltipOpacity.setValue(1);
      setActiveTooltipKey(key);

      tooltipTimerRef.current = setTimeout(() => {
        Animated.timing(tooltipOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver,
        }).start(({ finished }) => {
          if (finished) {
            setActiveTooltipKey((curr) => (curr === key ? null : curr));
          }
        });
      }, 5000);
    },
    [activeTooltipKey, clearTooltipTimer, tooltipOpacity]
  );

  useEffect(() => {
    if (!visible) {
      dismissTooltip();
    }
    return () => clearTooltipTimer();
  }, [visible, dismissTooltip, clearTooltipTimer]);

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

  const renderHelpIcon = (tooltipKey: string) => {
    const isActive = activeTooltipKey === tooltipKey;
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPressIn={() => {
          justPressedHelpRef.current = true;
        }}
        onPress={() => {
          toggleTooltip(tooltipKey);
          setTimeout(() => {
            justPressedHelpRef.current = false;
          }, 50);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[
          styles.helpBadgeBtn,
          {
            backgroundColor: isActive ? colors.primary : controlBg,
            borderColor: isActive ? colors.primary : colors.surfaceBorder,
            borderRadius: radii.chipInner,
          },
        ]}
      >
        <Text
          style={[
            styles.helpBadgeText,
            {
              color: isActive ? '#FFFFFF' : colors.textSecondary,
              fontFamily: typography.sansBold,
            },
          ]}
        >
          ?
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTooltipBox = (tooltipKey: string, text: string) => {
    if (activeTooltipKey !== tooltipKey) return null;
    return (
      <Animated.View
        style={[
          styles.tooltipBox,
          {
            opacity: tooltipOpacity,
            backgroundColor: isLight ? colors.surface : colors.background,
            borderColor: colors.primary + '55',
            borderRadius: radii.chip,
          },
        ]}
      >
        <Text
          style={[
            styles.tooltipText,
            { color: colors.textSecondary, fontFamily: typography.sansRegular },
          ]}
        >
          {text}
        </Text>
      </Animated.View>
    );
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
            borderRadius: radii.chipInner,
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
      <View
        style={[
          styles.backdrop,
          {
            backgroundColor: colors.overlayBackdrop,
            paddingBottom: keyboardHeight,
          },
        ]}
      >
        <Pressable
          style={styles.backdropDismissArea}
          onPress={() => {
            if (activeTooltipKey) {
              dismissTooltip();
            }
            onClose();
          }}
        />

        <Animated.View
          onTouchEnd={() => {
            if (activeTooltipKey && !justPressedHelpRef.current) {
              dismissTooltip();
            }
          }}
          style={[
            styles.sheet,
            shadows.modal,
            {
              backgroundColor: sheetBg,
              borderColor: colors.surfaceBorder,
              borderTopLeftRadius: radii.modalOuter,
              borderTopRightRadius: radii.modalOuter,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Top Drag Handle Bar (no "Settings" text or close button, matches other modals) */}
          <View {...dragHandlePanHandlers} style={styles.dragHandleArea}>
            <View
              style={[
                styles.dragHandleBar,
                {
                  backgroundColor: colors.surfaceBorder,
                  borderRadius: radii.handle,
                },
              ]}
            />
          </View>

          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            onScrollBeginDrag={() => {
              if (activeTooltipKey) {
                dismissTooltip();
              }
            }}
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
              {/* Theme Switcher (Has Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelWithIcon}>
                    {settings.themeMode === 'dark' ? (
                      <Moon size={17} color={colors.primary} />
                    ) : (
                      <Sun size={17} color={colors.primary} />
                    )}
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.themeLabel}
                    </Text>
                    {renderHelpIcon('theme')}
                  </View>

                  <View
                    style={[
                      styles.segmentedPill,
                      {
                        backgroundColor: controlBg,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.chip,
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
                        { borderRadius: radii.chipInner },
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
                        { borderRadius: radii.chipInner },
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
                {renderTooltipBox('theme', t.tooltipTheme)}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Language Switcher (Has Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelWithIcon}>
                    <Globe size={17} color={colors.primary} />
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.languageLabel}
                    </Text>
                    {renderHelpIcon('language')}
                  </View>

                  <View
                    style={[
                      styles.segmentedPill,
                      {
                        backgroundColor: controlBg,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.chip,
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
                        { borderRadius: radii.chipInner },
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
                        { borderRadius: radii.chipInner },
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
                {renderTooltipBox('language', t.tooltipLanguage)}
              </View>
            </View>

            {/* 2. SAFETY & CONTROLS (All have Icons) */}
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
              {/* System & Permission Check Icon Toggle (Has Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelWithIcon}>
                    <ShieldCheck size={17} color={colors.accent} />
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.toggleSafetyCheckTitle}
                    </Text>
                    {renderHelpIcon('safetyCheck')}
                  </View>
                  {renderSquircleToggle(settings.enableSafetyCheckBanner, (val) =>
                    void updateSettings({ enableSafetyCheckBanner: val })
                  )}
                </View>
                {renderTooltipBox('safetyCheck', t.tooltipSafetyCheck)}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Hardware Volume Buttons Configuration (Has Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowLabelWithIcon}>
                  <Volume2 size={17} color={colors.accent} />
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {t.volumeButtonActionLabel}
                  </Text>
                  {renderHelpIcon('volumeButtons')}
                </View>
                {renderTooltipBox('volumeButtons', t.tooltipVolumeButtons)}

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
                            borderRadius: radii.chip,
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

              {/* Early Wake-Up Window (Has Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowLabelWithIcon}>
                  <Sun size={17} color={colors.accent} />
                  <Text
                    style={[
                      styles.rowTitle,
                      { color: colors.textPrimary, fontFamily: typography.sansMedium },
                    ]}
                  >
                    {t.earlyDismissWindowLabel}
                  </Text>
                  {renderHelpIcon('earlyDismiss')}
                </View>
                {renderTooltipBox('earlyDismiss', t.tooltipEarlyDismiss)}

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
                            borderRadius: radii.chip,
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

            {/* 3. CATEGORIES MANAGEMENT (Has Icon) */}
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
              <View style={[styles.rowLabelWithIcon, { marginBottom: 10 }]}>
                <Tag size={16} color={colors.accent} />
                <Text
                  style={[
                    styles.rowTitle,
                    { color: colors.textPrimary, fontFamily: typography.sansMedium },
                  ]}
                >
                  {t.sectionCategories}
                </Text>
                {renderHelpIcon('categories')}
              </View>
              {renderTooltipBox('categories', t.tooltipCategories)}

              <View style={styles.categoryWrapRow}>
                {settings.categories.map((cat) => (
                  <View
                    key={cat}
                    style={[
                      styles.categoryManageTag,
                      {
                        backgroundColor: controlBg,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.chip,
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
                      borderRadius: radii.chip,
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
                      borderRadius: radii.chip,
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

            {/* 4. MULTI-ALARM SPACING STYLE (Has Icon) */}
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.textSecondary, fontFamily: typography.sansBold },
              ]}
            >
              {t.sectionAlarmType}
            </Text>
            <View
              style={[
                styles.cardGroup,
                {
                  backgroundColor: cardBg,
                  borderColor:
                    settings.intervalModeType === 'escalating'
                      ? colors.primary
                      : colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                  padding: 14,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  safeHaptics.selectionAsync();
                  setAlarmTypeModalVisible(true);
                }}
                style={styles.alarmTypeRow}
              >
                <View style={styles.alarmTypeLeft}>
                  <View
                    style={[
                      styles.alarmTypeIconBox,
                      { backgroundColor: colors.primaryMuted, borderRadius: radii.chip },
                    ]}
                  >
                    {settings.intervalModeType === 'escalating' ? (
                      <Flame size={20} color={colors.primary} />
                    ) : (
                      <Sliders size={20} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.alarmTypeTextCol}>
                    <View style={styles.rowLabelWithIcon}>
                      <Text
                        style={[
                          styles.rowTitle,
                          { color: colors.textPrimary, fontFamily: typography.sansBold },
                        ]}
                      >
                        {t.intervalAlarmTypeLabel}
                      </Text>
                      {renderHelpIcon('alarmType')}
                    </View>
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
                  </View>
                </View>
                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              {renderTooltipBox('alarmType', t.tooltipAlarmType)}
            </View>

            {/* 5. DEFAULT TIMES (NO ICONS per user requirement) */}
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
              {/* Default Snooze Time (No Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelNoIcon}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.defaultSnoozeLabel}
                    </Text>
                    {renderHelpIcon('defaultSnooze')}
                  </View>
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
                      style={[
                        styles.stepBtn,
                        { backgroundColor: controlBg, borderRadius: radii.chip },
                      ]}
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
                      style={[
                        styles.stepBtn,
                        { backgroundColor: controlBg, borderRadius: radii.chip },
                      ]}
                    >
                      <Plus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {renderTooltipBox('defaultSnooze', t.tooltipDefaultSnooze)}

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
                            borderRadius: radii.chip,
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

              {/* Default Interval Minutes (No Icon) */}
              <View
                style={[
                  styles.columnItem,
                  settings.intervalModeType === 'escalating' && { opacity: 0.45 },
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelNoIcon}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.defaultIntervalLabel}
                    </Text>
                    {renderHelpIcon('defaultInterval')}
                  </View>
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
                      style={[
                        styles.stepBtn,
                        { backgroundColor: controlBg, borderRadius: radii.chip },
                      ]}
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
                      style={[
                        styles.stepBtn,
                        { backgroundColor: controlBg, borderRadius: radii.chip },
                      ]}
                    >
                      <Plus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {renderTooltipBox('defaultInterval', t.tooltipDefaultInterval)}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Default Steps Count (No Icon) */}
              <View
                style={[
                  styles.columnItem,
                  settings.intervalModeType === 'escalating' && { opacity: 0.45 },
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelNoIcon}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.defaultStepsLabel}
                    </Text>
                    {renderHelpIcon('defaultSteps')}
                  </View>
                  <View style={styles.stepperGroup}>
                    <TouchableOpacity
                      disabled={settings.intervalModeType === 'escalating'}
                      onPress={() => {
                        safeHaptics.selectionAsync();
                        void updateSettings({
                          defaultAlarmCount: Math.max(2, settings.defaultAlarmCount - 1),
                        });
                      }}
                      style={[
                        styles.stepBtn,
                        { backgroundColor: controlBg, borderRadius: radii.chip },
                      ]}
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
                      style={[
                        styles.stepBtn,
                        { backgroundColor: controlBg, borderRadius: radii.chip },
                      ]}
                    >
                      <Plus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {renderTooltipBox('defaultSteps', t.tooltipDefaultSteps)}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Default Window Duration (No Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelNoIcon}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.defaultWindowDurationLabel}
                    </Text>
                    {renderHelpIcon('defaultWindow')}
                  </View>
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
                      style={[
                        styles.stepBtn,
                        { backgroundColor: controlBg, borderRadius: radii.chip },
                      ]}
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
                      style={[
                        styles.stepBtn,
                        { backgroundColor: controlBg, borderRadius: radii.chip },
                      ]}
                    >
                      <Plus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {renderTooltipBox('defaultWindow', t.tooltipDefaultWindow)}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Default Offset Direction (No Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelNoIcon}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.defaultDirectionLabel}
                    </Text>
                    {renderHelpIcon('defaultDirection')}
                  </View>
                  <View
                    style={[
                      styles.segmentedPill,
                      {
                        backgroundColor: controlBg,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.chip,
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
                        { borderRadius: radii.chipInner },
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
                        { borderRadius: radii.chipInner },
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
                {renderTooltipBox('defaultDirection', t.tooltipDefaultDirection)}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Default Power Nap Duration (No Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelNoIcon}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.defaultPowerNapLabel}
                    </Text>
                    {renderHelpIcon('defaultPowerNap')}
                  </View>
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
                      style={[
                        styles.stepBtn,
                        { backgroundColor: controlBg, borderRadius: radii.chip },
                      ]}
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
                      style={[
                        styles.stepBtn,
                        { backgroundColor: controlBg, borderRadius: radii.chip },
                      ]}
                    >
                      <Plus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {renderTooltipBox('defaultPowerNap', t.tooltipDefaultPowerNap)}
              </View>
            </View>

            {/* 6. FEATURE TOGGLES (NO ICONS per user requirement) */}
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
              {/* Show Alarm Sequence Section (No Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelNoIcon}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.toggleSequenceTitle}
                    </Text>
                    {renderHelpIcon('toggleSequence')}
                  </View>
                  {renderSquircleToggle(settings.showAlarmSequenceSection, (val) =>
                    void updateSettings({ showAlarmSequenceSection: val })
                  )}
                </View>
                {renderTooltipBox('toggleSequence', t.tooltipShowSequence)}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Show Advanced Creation Controls (No Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelNoIcon}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.toggleCreationControlsTitle}
                    </Text>
                    {renderHelpIcon('toggleCreationControls')}
                  </View>
                  {renderSquircleToggle(settings.showCreationAdvancedControls, (val) =>
                    void updateSettings({ showCreationAdvancedControls: val })
                  )}
                </View>
                {renderTooltipBox('toggleCreationControls', t.tooltipShowAdvanced)}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Show Power Nap Button (No Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelNoIcon}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.togglePowerNapTitle}
                    </Text>
                    {renderHelpIcon('togglePowerNap')}
                  </View>
                  {renderSquircleToggle(settings.showPowerNapButton, (val) =>
                    void updateSettings({ showPowerNapButton: val })
                  )}
                </View>
                {renderTooltipBox('togglePowerNap', t.tooltipShowPowerNap)}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />

              {/* Show Confirmation Toasts (No Icon) */}
              <View style={styles.columnItem}>
                <View style={styles.rowBetween}>
                  <View style={styles.rowLabelNoIcon}>
                    <Text
                      style={[
                        styles.rowTitle,
                        { color: colors.textPrimary, fontFamily: typography.sansMedium },
                      ]}
                    >
                      {t.toggleToastsTitle}
                    </Text>
                    {renderHelpIcon('toggleToasts')}
                  </View>
                  {renderSquircleToggle(settings.showToastBanners, (val) =>
                    void updateSettings({ showToastBanners: val })
                  )}
                </View>
                {renderTooltipBox('toggleToasts', t.tooltipShowToasts)}
              </View>
            </View>

            {/* Restore Default Settings Button */}
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

            {/* View Source Code Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                safeHaptics.selectionAsync();
                void Linking.openURL(PROJECT_GIT_URL);
              }}
              style={[
                styles.sourceCodeBtn,
                {
                  backgroundColor: cardBg,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              <Code size={16} color={colors.accent} />
              <Text
                style={[
                  styles.sourceCodeBtnText,
                  { color: colors.textPrimary, fontFamily: typography.sansMedium },
                ]}
              >
                {t.viewSourceCodeBtn}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>

      {/* Dedicated Modal for Interval Alarm Type Selection */}
      <Modal
        visible={alarmTypeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAlarmTypeModalVisible(false)}
      >
        <View style={[styles.subModalBackdrop, { backgroundColor: colors.overlayBackdrop }]}>
          <Pressable
            style={styles.backdropDismissArea}
            onPress={() => setAlarmTypeModalVisible(false)}
          />
          <Animated.View
            style={[
              styles.subModalCard,
              shadows.modal,
              {
                backgroundColor: isLight ? colors.cardOnBg : colors.surface,
                borderColor: colors.surfaceBorder,
                borderTopLeftRadius: radii.modalOuter,
                borderTopRightRadius: radii.modalOuter,
                transform: [{ translateY: alarmTypeSheetGesture.translateY }],
              },
            ]}
          >
            <View {...alarmTypeSheetGesture.dragHandlePanHandlers} style={styles.dragHandleArea}>
              <View
                style={[
                  styles.dragHandleBar,
                  {
                    backgroundColor: colors.surfaceBorder,
                    borderRadius: radii.handle,
                  },
                ]}
              />
              <Text
                style={[
                  styles.subModalTitle,
                  { color: colors.textPrimary, fontFamily: typography.sansBold },
                ]}
              >
                {t.selectAlarmTypeModalTitle}
              </Text>
              <Text
                style={[
                  styles.subModalDesc,
                  { color: colors.textSecondary, fontFamily: typography.sansRegular },
                ]}
              >
                {t.selectAlarmTypeModalDesc}
              </Text>
            </View>

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
                      {
                        backgroundColor: colors.primary,
                        borderRadius: radii.chipInner,
                      },
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
                      {
                        backgroundColor: colors.primary,
                        borderRadius: radii.chipInner,
                      },
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
          </Animated.View>
        </View>
      </Modal>
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
    maxHeight: '92%',
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  dragHandleArea: {
    width: '100%',
    paddingBottom: 6,
  },
  dragHandleBar: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    marginBottom: 8,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  columnItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rowLabelNoIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  rowTitle: {
    fontSize: 14,
    flexShrink: 1,
  },
  helpBadgeBtn: {
    width: 20,
    height: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBadgeText: {
    fontSize: 11,
    lineHeight: 14,
  },
  tooltipBox: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
  },
  tooltipText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  segmentedPill: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 3,
  },
  segmentOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  },
  alarmTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alarmTypeLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginRight: 8,
  },
  alarmTypeIconBox: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepValText: {
    fontSize: 14,
    minWidth: 56,
    textAlign: 'center',
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
  sourceCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    marginTop: 10,
    gap: 8,
  },
  sourceCodeBtnText: {
    fontSize: 14,
  },
  subModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  subModalCard: {
    width: '100%',
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  subModalTitle: {
    fontSize: 18,
    marginTop: 4,
    marginBottom: 6,
  },
  subModalDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
});
