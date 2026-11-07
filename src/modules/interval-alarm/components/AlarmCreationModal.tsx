import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Animated,
  Keyboard,
} from 'react-native';
import { Minus, Plus, Flame, Clock, Tag, Keyboard as KeyboardIcon } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { useTranslation } from '../../../core/i18n/translations';
import { AlarmItem, AlarmType } from '../types';
import { GoogleRadialClock } from './GoogleRadialClock';
import {
  getNextHourTime,
  getBaseAlarmSteps,
  getLiveDialParts,
} from '../engine/intervalEngine';
import { useAlarmStore } from '../store/alarmStore';
import { safeHaptics } from '../../../core/haptics/safeHaptics';
import { useSheetModalGesture } from './useSheetModalGesture';

interface AlarmCreationModalProps {
  visible: boolean;
  initialCategory?: string;
  onClose: () => void;
  onSave: (alarmData: Omit<AlarmItem, 'id'>) => void;
}

export const AlarmCreationModal: React.FC<AlarmCreationModalProps> = ({
  visible,
  initialCategory,
  onClose,
  onSave,
}) => {
  const { colors, typography, radii, shadows, themeMode, responsive } = useTheme();
  const { t, formatTime12h: formatTime12hLocal } = useTranslation();
  const actionBtnHeight = responsive.isCompact ? 42 : 48;
  const dayPillHeight = responsive.isCompact ? 34 : 38;
  const lastSelectedType = useAlarmStore((s) => s.lastSelectedType);
  const setLastSelectedType = useAlarmStore((s) => s.setLastSelectedType);

  const intervalModeType = useSettingsStore((s) => s.intervalModeType);
  const showCreationAdvancedControls = useSettingsStore(
    (s) => s.showCreationAdvancedControls
  );
  const enableKeyboardTimeInput = useSettingsStore((s) => s.enableKeyboardTimeInput);
  const categories = useSettingsStore((s) => s.categories);
  const isEscalatingMode = intervalModeType === 'escalating';

  const {
    translateY,
    backdropOpacity,
    keyboardHeight,
    onSheetLayout,
    dragHandlePanHandlers,
    sheetPanHandlers,
  } = useSheetModalGesture(visible, onClose);

  const alarmTabs: { key: AlarmType; label: string }[] = [
    { key: 'single', label: t.modeSingle },
    { key: 'interval', label: t.modeWindow },
    { key: 'offset', label: t.modeOffset },
  ];

  const [alarmType, setAlarmType] = useState<AlarmType>(lastSelectedType || 'single');
  const [activeTimeTab, setActiveTimeTab] = useState<'start' | 'end'>('start');
  const [dialResetKey, setDialResetKey] = useState(0);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const [isDialDragging, setIsDialDragging] = useState(false);
  const [startHour, setStartHour] = useState(12);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(13);
  const [endMinute, setEndMinute] = useState(0);
  const [offsetDirection, setOffsetDirection] = useState<'before' | 'after'>('before');
  const [alarmCount, setAlarmCount] = useState(10);
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [category, setCategory] = useState<string | undefined>(undefined);

  // When opened, reset to next-hour defaults + user settings defaults and last selected type
  useEffect(() => {
    if (visible) {
      const next = getNextHourTime();
      const currentType = useAlarmStore.getState().lastSelectedType || 'single';
      const settings = useSettingsStore.getState();
      const windowSpan = settings.defaultWindowDurationMinutes || 60;
      const startTotal = next.hour * 60 + next.minute;
      const endTotal = (startTotal + windowSpan) % (24 * 60);

      setAlarmType(currentType);
      setActiveTimeTab('start');
      setDialResetKey((k) => k + 1);
      setIsKeyboardMode(false);
      setIsDialDragging(false);
      setStartHour(next.hour);
      setStartMinute(next.minute);
      setEndHour(Math.floor(endTotal / 60));
      setEndMinute(endTotal % 60);
      setOffsetDirection(settings.defaultOffsetDirection || 'before');
      setAlarmCount(settings.defaultAlarmCount || 10);
      setIntervalMinutes(settings.defaultIntervalMinutes || 10);
      setRepeatDays([]);
      setCategory(initialCategory);
    }
  }, [visible, initialCategory]);

  const handleSelectType = (type: AlarmType) => {
    if (type === 'interval' && endHour === startHour && endMinute === startMinute) {
      const windowSpan =
        useSettingsStore.getState().defaultWindowDurationMinutes || 60;
      const endTotal = (startHour * 60 + startMinute + windowSpan) % (24 * 60);
      setEndHour(Math.floor(endTotal / 60));
      setEndMinute(endTotal % 60);
    }
    setAlarmType(type);
    setActiveTimeTab('start');
    setDialResetKey((k) => k + 1);
    if (!intervalMinutes) {
      setIntervalMinutes(10);
    }
    void setLastSelectedType(type);
  };

  const handleSelectTimeTab = (tab: 'start' | 'end') => {
    safeHaptics.selectionAsync();
    setActiveTimeTab(tab);
    setDialResetKey((k) => k + 1);
  };

  const handleMinuteSelectionComplete = () => {
    if (alarmType === 'interval' && activeTimeTab === 'start') {
      safeHaptics.selectionAsync();
      setActiveTimeTab('end');
      setDialResetKey((k) => k + 1);
    }
  };

  const handleTimeChange = (hour: number, minute: number) => {
    let nextStartH = startHour;
    let nextStartM = startMinute;
    let nextEndH = endHour;
    let nextEndM = endMinute;

    if (alarmType === 'interval' && activeTimeTab === 'end') {
      nextEndH = hour;
      nextEndM = minute;
      setEndHour(hour);
      setEndMinute(minute);
    } else {
      nextStartH = hour;
      nextStartM = minute;
      setStartHour(hour);
      setStartMinute(minute);
      if (alarmType !== 'interval') {
        const windowSpan =
          useSettingsStore.getState().defaultWindowDurationMinutes || 60;
        const endTotal = (hour * 60 + minute + windowSpan) % (24 * 60);
        nextEndH = Math.floor(endTotal / 60);
        nextEndM = endTotal % 60;
        setEndHour(nextEndH);
        setEndMinute(nextEndM);
      }
    }

    if (alarmType === 'interval') {
      const startTotal = nextStartH * 60 + nextStartM;
      let endTotal = nextEndH * 60 + nextEndM;
      if (endTotal <= startTotal) {
        endTotal += 24 * 60;
      }
      const windowSpan = endTotal - startTotal;
      if (windowSpan > 0 && windowSpan < intervalMinutes) {
        setIntervalMinutes(Math.max(1, windowSpan));
      }
    }
  };

  const previewSteps = useMemo(() => {
    if (!visible) return [];
    return getBaseAlarmSteps({
      type: alarmType,
      startHour,
      startMinute,
      endHour,
      endMinute,
      offsetDirection,
      alarmCount,
      intervalMinutes,
      isEscalating: alarmType !== 'single' ? isEscalatingMode : false,
    });
  }, [
    visible,
    alarmType,
    startHour,
    startMinute,
    endHour,
    endMinute,
    offsetDirection,
    alarmCount,
    intervalMinutes,
    isEscalatingMode,
  ]);

  const toggleRepeatDay = (dayIndex: number) => {
    safeHaptics.selectionAsync();
    setRepeatDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    Keyboard.dismiss();
    const generatedSequence =
      alarmType !== 'single' ? previewSteps.map((s) => s.timeString) : undefined;

    const newAlarm: Omit<AlarmItem, 'id'> = {
      type: alarmType,
      label: '',
      isEnabled: true,
      startHour,
      startMinute,
      endHour: alarmType === 'interval' ? endHour : undefined,
      endMinute: alarmType === 'interval' ? endMinute : undefined,
      offsetDirection: alarmType === 'offset' ? offsetDirection : undefined,
      alarmCount: alarmType === 'offset' ? alarmCount : undefined,
      intervalMinutes: alarmType !== 'single' ? intervalMinutes : undefined,
      isEscalating: alarmType !== 'single' ? isEscalatingMode : undefined,
      repeatDays,
      isOneOff: repeatDays.length === 0,
      dismissedForToday: false,
      generatedSequence,
      category,
    };

    onSave(newAlarm);
    onClose();
  };

  const currentDialHour =
    alarmType === 'interval' && activeTimeTab === 'end' ? endHour : startHour;
  const currentDialMinute =
    alarmType === 'interval' && activeTimeTab === 'end' ? endMinute : startMinute;

  const liveRingParts = useMemo(() => {
    if (!visible) return undefined;
    return getLiveDialParts({
      type: alarmType,
      startHour,
      startMinute,
      endHour,
      endMinute,
      offsetDirection,
      alarmCount,
      intervalMinutes,
      isEscalating: alarmType !== 'single' ? isEscalatingMode : false,
      repeatDays,
    });
  }, [
    visible,
    alarmType,
    startHour,
    startMinute,
    endHour,
    endMinute,
    offsetDirection,
    alarmCount,
    intervalMinutes,
    isEscalatingMode,
    repeatDays,
  ]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View
        style={[
          styles.modalOverlay,
          {
            paddingBottom: keyboardHeight,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.overlayBackdrop,
              opacity: backdropOpacity,
            },
          ]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          accessibilityLabel="Close create modal"
        />

        <Animated.View
          onLayout={onSheetLayout}
          {...sheetPanHandlers}
          style={[
            styles.modalContent,
            shadows.modal,
            {
              height: responsive.isCompact ? '92%' : '88%',
              maxWidth: responsive.modalMaxWidth,
              alignSelf: 'center',
              backgroundColor: colors.background,
              borderColor: colors.surfaceBorder,
              borderTopLeftRadius: radii.modalOuter,
              borderTopRightRadius: radii.modalOuter,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Top Drag Handle Zone */}
          <View
            {...dragHandlePanHandlers}
            style={[
              styles.dragHandleZone,
              {
                paddingTop: responsive.s(10),
                paddingBottom: responsive.s(12),
              },
            ]}
          >
            <View
              style={[
                styles.handleBar,
                {
                  borderRadius: radii.handle,
                  backgroundColor:
                    themeMode === 'dark'
                      ? 'rgba(255, 255, 255, 0.22)'
                      : colors.surfaceBorder,
                },
              ]}
            />
          </View>

          <ScrollView
            style={styles.scrollView}
            scrollEnabled={!isDialDragging}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: responsive.s(14) },
            ]}
          >
            {/* Alarm Type Switcher */}
            <View
              style={[
                styles.segmentedType,
                {
                  marginHorizontal: responsive.screenPadding,
                  marginBottom: responsive.s(12),
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.chip,
                },
              ]}
            >
              {alarmTabs.map((tab) => {
                const isSelected = alarmType === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    activeOpacity={0.8}
                    onPress={() => handleSelectType(tab.key)}
                    style={[
                      styles.typeSegment,
                      { paddingVertical: responsive.s(8) },
                      isSelected && {
                        backgroundColor: colors.surfaceSubtle,
                        borderRadius: radii.chipInner,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        {
                          fontSize: responsive.ms(13),
                          color: isSelected ? colors.textPrimary : colors.textMuted,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Google Radial Clock Dial */}
            <GoogleRadialClock
              selectedHour={currentDialHour}
              selectedMinute={currentDialMinute}
              onTimeChange={handleTimeChange}
              onMinuteSelectionComplete={handleMinuteSelectionComplete}
              onDialDragStateChange={setIsDialDragging}
              resetKey={dialResetKey}
              isKeyboardMode={isKeyboardMode}
              liveDurationParts={liveRingParts}
            />

            {/* Mode-Specific Controls Below Clock */}
            {alarmType === 'interval' && (
              <View
                style={[
                  styles.intervalTimesContainer,
                  {
                    marginHorizontal: responsive.screenPadding,
                    marginTop: responsive.s(12),
                  },
                ]}
              >
                <View style={[styles.intervalCardRow, { gap: responsive.s(10) }]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSelectTimeTab('start')}
                    style={[
                      styles.timeSelectorCard,
                      {
                        padding: responsive.s(12),
                        backgroundColor:
                          activeTimeTab === 'start' ? colors.surfaceSubtle : colors.surface,
                        borderColor:
                          activeTimeTab === 'start' ? colors.primary : colors.surfaceBorder,
                        borderRadius: radii.cardInner,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeCardLabel,
                        {
                          fontSize: responsive.ms(10.5),
                          color: colors.textSecondary,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      {t.startTime.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.timeCardValue,
                        {
                          fontSize: responsive.ms(15.5),
                          color: colors.textPrimary,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      {formatTime12hLocal(startHour, startMinute).full}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSelectTimeTab('end')}
                    style={[
                      styles.timeSelectorCard,
                      {
                        padding: responsive.s(12),
                        backgroundColor:
                          activeTimeTab === 'end' ? colors.surfaceSubtle : colors.surface,
                        borderColor:
                          activeTimeTab === 'end' ? colors.primary : colors.surfaceBorder,
                        borderRadius: radii.cardInner,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeCardLabel,
                        {
                          fontSize: responsive.ms(10.5),
                          color: colors.textSecondary,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      {t.endTime.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.timeCardValue,
                        {
                          fontSize: responsive.ms(15.5),
                          color: colors.textPrimary,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      {formatTime12hLocal(endHour, endMinute).full}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {alarmType === 'offset' && showCreationAdvancedControls && (
              <View
                style={[
                  styles.offsetOptionsContainer,
                  {
                    marginHorizontal: responsive.screenPadding,
                    marginTop: responsive.s(12),
                  },
                ]}
              >
                <View
                  style={[
                    styles.offsetDirectionRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.chip,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setOffsetDirection('before')}
                    style={[
                      styles.directionTab,
                      { paddingVertical: responsive.s(9) },
                      offsetDirection === 'before' && {
                        backgroundColor: colors.surfaceSubtle,
                        borderRadius: radii.chipInner,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.directionTabText,
                        {
                          fontSize: responsive.ms(12),
                          color:
                            offsetDirection === 'before'
                              ? colors.textPrimary
                              : colors.textMuted,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      {t.before}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setOffsetDirection('after')}
                    style={[
                      styles.directionTab,
                      { paddingVertical: responsive.s(9) },
                      offsetDirection === 'after' && {
                        backgroundColor: colors.surfaceSubtle,
                        borderRadius: radii.chipInner,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.directionTabText,
                        {
                          fontSize: responsive.ms(12),
                          color:
                            offsetDirection === 'after'
                              ? colors.textPrimary
                              : colors.textMuted,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      {t.after}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Escalating Interval Info Banner */}
            {alarmType !== 'single' && isEscalatingMode && (
              <View
                style={[
                  styles.escalatingBanner,
                  {
                    marginHorizontal: responsive.screenPadding,
                    marginTop: responsive.s(12),
                    padding: responsive.s(12),
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.primary + '55',
                    borderRadius: radii.cardInner,
                  },
                ]}
              >
                <View style={styles.escalatingBannerHeader}>
                  <View style={styles.escalatingTitleRow}>
                    <Flame size={Math.round(responsive.ms(15))} color={colors.primary} />
                    <Text
                      style={[
                        styles.escalatingBannerTitle,
                        {
                          fontSize: responsive.ms(12.5),
                          color: colors.textPrimary,
                          fontFamily: typography.sansBold,
                        },
                      ]}
                    >
                      {t.escalatingModeActiveTitle}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.escalatingCountText,
                      {
                        fontSize: responsive.ms(11.5),
                        color: colors.primaryLight,
                        fontFamily: typography.numbersBold,
                      },
                    ]}
                  >
                    {t.generatesNAlarms(previewSteps.length)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.escalatingBannerDesc,
                    {
                      fontSize: responsive.ms(11.5),
                      lineHeight: responsive.ms(16.5),
                      color: colors.textSecondary,
                      fontFamily: typography.sansRegular,
                    },
                  ]}
                >
                  {alarmType === 'interval' ? t.escalatingWindowDesc : t.escalatingModeDesc}
                </Text>
              </View>
            )}

            {/* Interval Length Stepper */}
            {alarmType !== 'single' && !isEscalatingMode && showCreationAdvancedControls && (
              <View
                style={[
                  styles.sectionContainer,
                  {
                    marginHorizontal: responsive.screenPadding,
                    marginTop: responsive.s(12),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeading,
                    {
                      fontSize: responsive.ms(10.5),
                      color: colors.textSecondary,
                      fontFamily: typography.numbersBold,
                    },
                  ]}
                >
                  {t.intervalLabel.toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.stepperContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.cardInner,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIntervalMinutes(Math.max(1, intervalMinutes - 1))}
                    style={styles.stepperBtn}
                  >
                    <Minus
                      size={Math.round(responsive.ms(17))}
                      color={colors.textPrimary}
                      strokeWidth={2.4}
                    />
                  </TouchableOpacity>

                  <Text
                    style={[
                      styles.stepperValueText,
                      {
                        fontSize: responsive.ms(14.5),
                        color: colors.textPrimary,
                        fontFamily: typography.numbersBold,
                      },
                    ]}
                  >
                    {t.everyNMin(intervalMinutes)}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIntervalMinutes(Math.min(60, intervalMinutes + 1))}
                    style={styles.stepperBtn}
                  >
                    <Plus
                      size={Math.round(responsive.ms(17))}
                      color={colors.textPrimary}
                      strokeWidth={2.4}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Offset Alarm Count Stepper */}
            {alarmType === 'offset' && !isEscalatingMode && showCreationAdvancedControls && (
              <View
                style={[
                  styles.sectionContainer,
                  {
                    marginHorizontal: responsive.screenPadding,
                    marginTop: responsive.s(12),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeading,
                    {
                      fontSize: responsive.ms(10.5),
                      color: colors.textSecondary,
                      fontFamily: typography.numbersBold,
                    },
                  ]}
                >
                  {t.alarmsCountLabel.toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.stepperContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.cardInner,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setAlarmCount(Math.max(2, alarmCount - 1))}
                    style={styles.stepperBtn}
                  >
                    <Minus
                      size={Math.round(responsive.ms(17))}
                      color={colors.textPrimary}
                      strokeWidth={2.4}
                    />
                  </TouchableOpacity>

                  <Text
                    style={[
                      styles.stepperValueText,
                      {
                        fontSize: responsive.ms(14.5),
                        color: colors.textPrimary,
                        fontFamily: typography.numbersBold,
                      },
                    ]}
                  >
                    {t.alarmsCountSummary(alarmCount)}
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setAlarmCount(Math.min(30, alarmCount + 1))}
                    style={styles.stepperBtn}
                  >
                    <Plus
                      size={Math.round(responsive.ms(17))}
                      color={colors.textPrimary}
                      strokeWidth={2.4}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Repeat Days Selector */}
            <View
              style={[
                styles.sectionContainer,
                {
                  marginHorizontal: responsive.screenPadding,
                  marginTop: responsive.s(12),
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionHeading,
                  {
                    fontSize: responsive.ms(10.5),
                    color: colors.textSecondary,
                    fontFamily: typography.numbersBold,
                  },
                ]}
              >
                {t.repeatDaysLabel.toUpperCase()}
              </Text>
              <View style={[styles.repeatRow, { gap: responsive.s(5) }]}>
                {t.dayInitials.map((dayInitial, idx) => {
                  const isDaySelected = repeatDays.includes(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.8}
                      onPress={() => toggleRepeatDay(idx)}
                      style={[
                        styles.dayPill,
                        {
                          height: dayPillHeight,
                          backgroundColor: isDaySelected ? colors.primary : colors.surface,
                          borderColor: isDaySelected
                            ? colors.primaryLight
                            : colors.surfaceBorder,
                          borderRadius: radii.chip,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayPillText,
                          {
                            fontSize: responsive.ms(12.5),
                            color: isDaySelected ? '#FFFFFF' : colors.textSecondary,
                            fontFamily: typography.numbersBold,
                          },
                        ]}
                      >
                        {dayInitial}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Category Tag Selector */}
            {categories.length > 0 && (
              <View
                style={[
                  styles.sectionContainer,
                  {
                    marginHorizontal: responsive.screenPadding,
                    marginTop: responsive.s(12),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeading,
                    {
                      fontSize: responsive.ms(10.5),
                      color: colors.textSecondary,
                      fontFamily: typography.numbersBold,
                    },
                  ]}
                >
                  {t.categoryLabel.toUpperCase()}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryChipsRow}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      setCategory(undefined);
                    }}
                    style={[
                      styles.categoryChip,
                      {
                        paddingHorizontal: responsive.s(11),
                        paddingVertical: responsive.s(6),
                        backgroundColor: !category ? colors.accent : colors.surface,
                        borderColor: !category ? colors.accent : colors.surfaceBorder,
                        borderRadius: radii.chip,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          fontSize: responsive.ms(11.5),
                          color: !category ? '#FFFFFF' : colors.textSecondary,
                          fontFamily: !category ? typography.sansBold : typography.sansMedium,
                        },
                      ]}
                    >
                      {t.categoryNone}
                    </Text>
                  </TouchableOpacity>

                  {categories.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        activeOpacity={0.8}
                        onPress={() => {
                          safeHaptics.selectionAsync();
                          setCategory(isSelected ? undefined : cat);
                        }}
                        style={[
                          styles.categoryChip,
                          {
                            paddingHorizontal: responsive.s(11),
                            paddingVertical: responsive.s(6),
                            backgroundColor: isSelected ? colors.accent : colors.surface,
                            borderColor: isSelected ? colors.accent : colors.surfaceBorder,
                            borderRadius: radii.chip,
                          },
                        ]}
                      >
                        <Tag
                          size={Math.round(responsive.ms(10.5))}
                          color={isSelected ? '#FFFFFF' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            {
                              fontSize: responsive.ms(11.5),
                              color: isSelected ? '#FFFFFF' : colors.textSecondary,
                              fontFamily: isSelected
                                ? typography.sansBold
                                : typography.sansMedium,
                            },
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Bar */}
          <View
            style={[
              styles.bottomActionBar,
              {
                paddingHorizontal: responsive.screenPadding,
                paddingTop: responsive.s(10),
                paddingBottom: responsive.modalBottomPadding,
                borderTopColor: colors.surfaceBorder,
                backgroundColor: colors.background,
              },
            ]}
          >
            {enableKeyboardTimeInput && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  safeHaptics.selectionAsync();
                  setIsKeyboardMode((v) => {
                    if (v) Keyboard.dismiss();
                    return !v;
                  });
                }}
                accessibilityLabel={isKeyboardMode ? t.useDialTooltip : t.useKeyboardTooltip}
                style={[
                  styles.bottomKeypadBtn,
                  {
                    width: actionBtnHeight,
                    height: actionBtnHeight,
                    backgroundColor: isKeyboardMode ? colors.primary + '25' : colors.surface,
                    borderColor: isKeyboardMode ? colors.primary : colors.surfaceBorder,
                    borderRadius: radii.button,
                  },
                ]}
              >
                {isKeyboardMode ? (
                  <Clock size={Math.round(responsive.ms(19))} color={colors.primary} />
                ) : (
                  <KeyboardIcon
                    size={Math.round(responsive.ms(19))}
                    color={colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              style={[
                styles.bottomCancelBtn,
                {
                  height: actionBtnHeight,
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.button,
                },
              ]}
            >
              <Text
                style={[
                  styles.bottomCancelBtnText,
                  {
                    fontSize: responsive.ms(14.5),
                    color: colors.textSecondary,
                    fontFamily: typography.numbersBold,
                  },
                ]}
              >
                {t.cancel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSave}
              style={[
                styles.bottomSaveBtn,
                {
                  height: actionBtnHeight,
                  backgroundColor: colors.textPrimary,
                  borderRadius: radii.button,
                },
              ]}
            >
              <Text
                style={[
                  styles.bottomSaveBtnText,
                  {
                    fontSize: responsive.ms(14.5),
                    color: colors.textOnPrimary,
                    fontFamily: typography.numbersBold,
                  },
                ]}
              >
                {t.save}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '92%',
    width: '100%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  dragHandleZone: {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
    paddingTop: 2,
  },
  segmentedType: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  typeSegment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  repeatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayPill: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillText: {
    fontSize: 13,
  },
  intervalTimesContainer: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  intervalCardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeSelectorCard: {
    flex: 1,
    padding: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  timeCardLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  timeCardValue: {
    fontSize: 16,
  },
  offsetOptionsContainer: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  offsetDirectionRow: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 3,
  },
  directionTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionTabText: {
    fontSize: 12,
  },
  escalatingBanner: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
  },
  escalatingBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  escalatingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  escalatingBannerTitle: {
    fontSize: 13,
  },
  escalatingCountText: {
    fontSize: 12,
  },
  escalatingBannerDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  sectionHeading: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  stepperBtn: {
    padding: 10,
  },
  stepperValueText: {
    fontSize: 15,
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  bottomKeypadBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bottomCancelBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bottomCancelBtnText: {
    fontSize: 15,
  },
  bottomSaveBtn: {
    flex: 1.5,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSaveBtnText: {
    fontSize: 15,
  },
});
