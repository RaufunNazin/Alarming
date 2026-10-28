import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  Keyboard,
} from 'react-native';
import {
  Minus,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  RotateCcw,
  SlidersHorizontal,
  Flame,
  Tag,
  Copy,
  CalendarOff,
  CalendarCheck,
} from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useSettingsStore } from '../../../core/settings/settingsStore';
import { useTranslation } from '../../../core/i18n/translations';
import { AlarmItem, AlarmType, CustomAlarmStep } from '../types';
import { ClockEditModal } from './ClockEditModal';
import {
  formatTime12h,
  getBaseAlarmSteps,
  formatRepeatDays,
  formatSkippedDateLabel,
} from '../engine/intervalEngine';
import { safeHaptics } from '../../../core/haptics/safeHaptics';
import { useSheetModalGesture } from './useSheetModalGesture';

interface AlarmEditModalProps {
  visible: boolean;
  alarm: AlarmItem | null;
  onClose: () => void;
  onSave: (alarmData: Omit<AlarmItem, 'id'>) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleSkipNext?: (id: string) => void;
}

function buildUniformCustomSteps(
  type: AlarmType,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number,
  offsetDirection: 'before' | 'after',
  alarmCount: number,
  intervalMinutes: number,
  isEscalating: boolean = false
): CustomAlarmStep[] {
  return getBaseAlarmSteps({
    type,
    startHour,
    startMinute,
    endHour,
    endMinute,
    offsetDirection,
    alarmCount,
    intervalMinutes,
    isEscalating,
  }).map((s) => ({
    hour: s.hour,
    minute: s.minute,
    isEnabled: true,
  }));
}

export const AlarmEditModal: React.FC<AlarmEditModalProps> = ({
  visible,
  alarm,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  onToggleSkipNext,
}) => {
  const { colors, typography, radii, shadows, themeMode } = useTheme();
  const { t, language, formatNum, formatTime12h: formatTime12hLocal } = useTranslation();
  const showAlarmSequenceSection = useSettingsStore((s) => s.showAlarmSequenceSection);
  const intervalModeType = useSettingsStore((s) => s.intervalModeType);
  const categories = useSettingsStore((s) => s.categories);

  const { translateY, keyboardHeight, dragHandlePanHandlers } = useSheetModalGesture(
    visible,
    onClose
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteConfirmGesture = useSheetModalGesture(showDeleteConfirm, () =>
    setShowDeleteConfirm(false)
  );

  // Internal alarm state
  const [alarmType, setAlarmType] = useState<AlarmType>('single');
  const [startHour, setStartHour] = useState(6);
  const [startMinute, setStartMinute] = useState(30);
  const [endHour, setEndHour] = useState(7);
  const [endMinute, setEndMinute] = useState(30);
  const [offsetDirection, setOffsetDirection] = useState<'before' | 'after'>('before');
  const [alarmCount, setAlarmCount] = useState(10);
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [isEscalating, setIsEscalating] = useState(false);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [steps, setSteps] = useState<CustomAlarmStep[]>([]);

  // Dropdown & submodal states
  const [isGranularOpen, setIsGranularOpen] = useState(false);
  const [clockModalVisible, setClockModalVisible] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible && alarm) {
      const initType = alarm.type;
      const initStartH = alarm.startHour;
      const initStartM = alarm.startMinute;
      const initEndH = alarm.endHour ?? (alarm.startHour + 1) % 24;
      const initEndM = alarm.endMinute ?? alarm.startMinute;
      const initDir = alarm.offsetDirection || 'before';
      const initCount = alarm.alarmCount || 10;
      const initInterval = alarm.intervalMinutes || 10;
      const initEscalating =
        initType !== 'single' &&
        (alarm.isEscalating !== undefined
          ? alarm.isEscalating
          : intervalModeType === 'escalating');

      setAlarmType(initType);
      setStartHour(initStartH);
      setStartMinute(initStartM);
      setEndHour(initEndH);
      setEndMinute(initEndM);
      setOffsetDirection(initDir);
      setAlarmCount(initCount);
      setIntervalMinutes(initInterval);
      setIsEscalating(initEscalating);
      setLabel(alarm.label || '');
      setCategory(alarm.category);
      setRepeatDays(alarm.repeatDays || []);

      if (
        alarm.customSteps &&
        alarm.customSteps.length > 0 &&
        Boolean(alarm.isEscalating) === initEscalating
      ) {
        setSteps(alarm.customSteps.map((s) => ({ ...s })));
      } else {
        setSteps(
          buildUniformCustomSteps(
            initType,
            initStartH,
            initStartM,
            initEndH,
            initEndM,
            initDir,
            initCount,
            initInterval,
            initEscalating
          )
        );
      }

      setIsGranularOpen(false);
      setClockModalVisible(false);
      setEditingStepIndex(null);
      setShowDeleteConfirm(false);
    }
  }, [visible, alarm, intervalModeType]);

  const uniformReferenceSteps = useMemo(() => {
    if (!visible || !alarm) return [];
    return buildUniformCustomSteps(
      alarmType,
      startHour,
      startMinute,
      endHour,
      endMinute,
      offsetDirection,
      alarmCount,
      intervalMinutes,
      isEscalating
    );
  }, [
    visible,
    alarm,
    alarmType,
    startHour,
    startMinute,
    endHour,
    endMinute,
    offsetDirection,
    alarmCount,
    intervalMinutes,
    isEscalating,
  ]);

  const isStepsCustomized = useMemo(() => {
    if (steps.length !== uniformReferenceSteps.length) return true;
    for (let i = 0; i < steps.length; i++) {
      const cur = steps[i];
      const ref = uniformReferenceSteps[i];
      if (!cur.isEnabled || cur.hour !== ref.hour || cur.minute !== ref.minute) {
        return true;
      }
    }
    return false;
  }, [steps, uniformReferenceSteps]);

  if (!visible || !alarm) return null;

  const totalStepCount = steps.length;
  const enabledStepCount = steps.filter((s) => s.isEnabled).length;

  const toggleDay = (dayIndex: number) => {
    if (repeatDays.includes(dayIndex)) {
      setRepeatDays(repeatDays.filter((d) => d !== dayIndex));
    } else {
      setRepeatDays([...repeatDays, dayIndex].sort());
    }
  };

  // Sync top-level start/end times whenever individual steps are modified
  const syncEndpointsFromSteps = (nextSteps: CustomAlarmStep[], nextType: AlarmType = alarmType) => {
    if (nextSteps.length === 0) return;
    const first = nextSteps[0];
    const last = nextSteps[nextSteps.length - 1];

    if (nextType === 'offset' && offsetDirection === 'before') {
      setStartHour(last.hour);
      setStartMinute(last.minute);
    } else {
      setStartHour(first.hour);
      setStartMinute(first.minute);
      if (nextType === 'interval') {
        setEndHour(last.hour);
        setEndMinute(last.minute);
      }
    }
  };

  const handleClockConfirm = (result: {
    type: AlarmType;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    offsetDirection: 'before' | 'after';
  }) => {
    if (editingStepIndex !== null) {
      // Editing an individual step's timing
      const nextSteps = steps.map((s, idx) =>
        idx === editingStepIndex
          ? { ...s, hour: result.startHour, minute: result.startMinute }
          : s
      );
      setSteps(nextSteps);
      syncEndpointsFromSteps(nextSteps, alarmType);
      setEditingStepIndex(null);
      setClockModalVisible(false);
      return;
    }

    // Editing the macro alarm time / mode
    const nextEscalating =
      result.type !== 'single' && (isEscalating || intervalModeType === 'escalating');
    setAlarmType(result.type);
    setStartHour(result.startHour);
    setStartMinute(result.startMinute);
    setEndHour(result.endHour);
    setEndMinute(result.endMinute);
    setOffsetDirection(result.offsetDirection);
    setIsEscalating(nextEscalating);

    const rebuilt = buildUniformCustomSteps(
      result.type,
      result.startHour,
      result.startMinute,
      result.endHour,
      result.endMinute,
      result.offsetDirection,
      alarmCount,
      intervalMinutes,
      nextEscalating
    );
    setSteps(rebuilt);
    setClockModalVisible(false);
  };

  const handleToggleEscalatingInEdit = (nextVal: boolean) => {
    setIsEscalating(nextVal);
    const rebuilt = buildUniformCustomSteps(
      alarmType,
      startHour,
      startMinute,
      endHour,
      endMinute,
      offsetDirection,
      alarmCount,
      intervalMinutes,
      nextVal
    );
    setSteps(rebuilt);
  };

  const handleChangeIntervalMinutes = (nextInterval: number) => {
    const clamped = Math.max(1, Math.min(60, nextInterval));
    setIntervalMinutes(clamped);

    const rebuilt = buildUniformCustomSteps(
      alarmType,
      startHour,
      startMinute,
      endHour,
      endMinute,
      offsetDirection,
      alarmCount,
      clamped,
      isEscalating
    ).map((step, idx) => ({
      ...step,
      isEnabled: steps[idx] ? steps[idx].isEnabled : true,
    }));
    setSteps(rebuilt);
  };

  const handleChangeTotalAlarms = (delta: number) => {
    const nextCount = Math.max(1, Math.min(30, steps.length + delta));
    if (nextCount === steps.length) return;

    if (nextCount === 1) {
      const kept = steps[0] || { hour: startHour, minute: startMinute, isEnabled: true };
      const singleStep = [{ ...kept, isEnabled: true }];
      setAlarmType('single');
      setIsEscalating(false);
      setStartHour(kept.hour);
      setStartMinute(kept.minute);
      setSteps(singleStep);
      return;
    }

    if (alarmType === 'offset') {
      setAlarmCount(nextCount);
      const rebuilt = buildUniformCustomSteps(
        'offset',
        startHour,
        startMinute,
        endHour,
        endMinute,
        offsetDirection,
        nextCount,
        intervalMinutes,
        isEscalating
      ).map((step, idx) => ({
        ...step,
        isEnabled: steps[idx] ? steps[idx].isEnabled : true,
      }));
      setSteps(rebuilt);
      return;
    }

    // For 'single' transitioning to multi-alarm or 'interval' (Window) mode:
    const effectiveType: AlarmType = alarmType === 'single' ? 'interval' : alarmType;
    if (alarmType === 'single') {
      setAlarmType('interval');
    }

    if (delta > 0) {
      const last = steps[steps.length - 1] || {
        hour: startHour,
        minute: startMinute,
        isEnabled: true,
      };
      const nextTotalMin = (last.hour * 60 + last.minute + intervalMinutes) % (24 * 60);
      const newStep: CustomAlarmStep = {
        hour: Math.floor(nextTotalMin / 60),
        minute: nextTotalMin % 60,
        isEnabled: true,
      };
      const nextSteps = [...steps, newStep];
      setSteps(nextSteps);
      setAlarmCount(nextSteps.length);
      syncEndpointsFromSteps(nextSteps, effectiveType);
    } else {
      const nextSteps = steps.slice(0, nextCount);
      // Ensure at least one step stays enabled
      if (!nextSteps.some((s) => s.isEnabled) && nextSteps.length > 0) {
        nextSteps[0] = { ...nextSteps[0], isEnabled: true };
      }
      setSteps(nextSteps);
      setAlarmCount(nextSteps.length);
      syncEndpointsFromSteps(nextSteps, effectiveType);
    }
  };

  const handleToggleStepEnabled = (index: number) => {
    const target = steps[index];
    if (!target) return;
    // Ensure at least 1 alarm timing remains enabled
    if (target.isEnabled && enabledStepCount <= 1) {
      return;
    }
    const nextSteps = steps.map((s, idx) =>
      idx === index ? { ...s, isEnabled: !s.isEnabled } : s
    );
    setSteps(nextSteps);
  };

  const handleNudgeStepTime = (index: number, deltaMinutes: number) => {
    const target = steps[index];
    if (!target) return;
    const totalMin = (target.hour * 60 + target.minute + deltaMinutes + 24 * 60) % (24 * 60);
    const nextSteps = steps.map((s, idx) =>
      idx === index
        ? {
            ...s,
            hour: Math.floor(totalMin / 60),
            minute: totalMin % 60,
          }
        : s
    );
    setSteps(nextSteps);
    syncEndpointsFromSteps(nextSteps, alarmType);
  };

  const handleResetCustomSteps = () => {
    setSteps(
      buildUniformCustomSteps(
        alarmType,
        startHour,
        startMinute,
        endHour,
        endMinute,
        offsetDirection,
        alarmCount,
        intervalMinutes,
        isEscalating
      )
    );
  };

  const handleSave = () => {
    const activeSteps = steps.filter((s) => s.isEnabled);
    const effectiveActive = activeSteps.length > 0 ? activeSteps : steps.slice(0, 1);

    const generatedSequence =
      alarmType !== 'single' || steps.length > 1
        ? effectiveActive.map((s) => formatTime12h(s.hour, s.minute))
        : undefined;

    const timeOrConfigChanged =
      startHour !== alarm.startHour ||
      startMinute !== alarm.startMinute ||
      endHour !== (alarm.endHour ?? (alarm.startHour + 1) % 24) ||
      endMinute !== (alarm.endMinute ?? alarm.startMinute) ||
      intervalMinutes !== (alarm.intervalMinutes ?? 10) ||
      offsetDirection !== (alarm.offsetDirection ?? 'before') ||
      alarmCount !== (alarm.alarmCount ?? 10) ||
      isEscalating !== Boolean(alarm.isEscalating) ||
      alarmType !== alarm.type ||
      JSON.stringify(steps) !== JSON.stringify(alarm.customSteps || []) ||
      JSON.stringify(repeatDays) !== JSON.stringify(alarm.repeatDays || []);

    const finalIsEnabled = !alarm.isEnabled && timeOrConfigChanged ? true : alarm.isEnabled;

    const updatedAlarm: Omit<AlarmItem, 'id'> = {
      type: alarmType,
      label: label.trim(),
      isEnabled: finalIsEnabled,
      startHour,
      startMinute,
      endHour: alarmType === 'interval' ? endHour : undefined,
      endMinute: alarmType === 'interval' ? endMinute : undefined,
      offsetDirection: alarmType === 'offset' ? offsetDirection : undefined,
      alarmCount: alarmType === 'offset' ? steps.length : undefined,
      intervalMinutes: alarmType !== 'single' ? intervalMinutes : undefined,
      isEscalating: alarmType !== 'single' ? isEscalating : false,
      repeatDays,
      isOneOff: !repeatDays || repeatDays.length === 0,
      dismissedForToday: alarm.dismissedForToday,
      generatedSequence,
      customSteps: steps,
      category,
      skipNextDate: alarm.skipNextDate,
    };

    onSave(updatedAlarm);
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    setShowDeleteConfirm(true);
  };

  const activeSequenceSteps = steps.filter((s) => s.isEnabled);
  const firstActive = activeSequenceSteps[0] || steps[0] || { hour: startHour, minute: startMinute };
  const lastActive =
    activeSequenceSteps[activeSequenceSteps.length - 1] ||
    steps[steps.length - 1] || { hour: endHour, minute: endMinute };

  const timeDisplayString =
    alarmType === 'single' && totalStepCount <= 1
      ? formatTime12hLocal(firstActive.hour, firstActive.minute).full
      : `${formatTime12hLocal(firstActive.hour, firstActive.minute).full} – ${
          formatTime12hLocal(lastActive.hour, lastActive.minute).full
        }`;

  const typeSubtitle =
    alarmType === 'interval'
      ? `${isEscalating ? t.escalatingBadge : t.modeWindow} • ${t.alarmsCountSummary(
          enabledStepCount
        )}`
      : alarmType === 'offset'
      ? `${isEscalating ? t.escalatingBadge : t.modeOffset} • ${t.alarmsCountSummary(
          enabledStepCount
        )} (${offsetDirection === 'before' ? t.before : t.after})`
      : t.modeSingle;

  const dropdownTitle =
    enabledStepCount < totalStepCount
      ? t.alarmSequencePartialTitle(enabledStepCount, totalStepCount)
      : t.alarmSequenceTitle(totalStepCount);

  const dropdownSubtitle =
    totalStepCount > 1
      ? isEscalating
        ? t.escalatingModeDesc
        : `${t.everyNMin(intervalMinutes)} • ${t.alarmSequenceHint}`
      : t.alarmSequenceHint;

  const editingStep = editingStepIndex !== null ? steps[editingStepIndex] : null;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: colors.overlayBackdrop,
              paddingBottom: keyboardHeight,
            },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              onClose();
            }}
            accessibilityLabel="Close edit modal"
          />

          <Animated.View
            style={[
              styles.modalContent,
              shadows.modal,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfaceBorder,
                borderTopLeftRadius: radii.modalOuter,
                borderTopRightRadius: radii.modalOuter,
                transform: [{ translateY }],
              },
            ]}
          >
            {/* Top Drag Handle Zone */}
            <View {...dragHandlePanHandlers} style={styles.dragHandleZone}>
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
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              contentContainerStyle={{ paddingBottom: 14, paddingTop: 2 }}
            >
              {/* Selected Time Banner with "Edit" Button */}
              <View
                style={[
                  styles.timeCardBanner,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radii.cardOuter,
                  },
                ]}
              >
                <View style={styles.timeCardTextCol}>
                  <Text
                    style={[
                      styles.timeBannerValue,
                      { color: colors.textPrimary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    {timeDisplayString}
                  </Text>
                  <Text
                    style={[
                      styles.timeBannerType,
                      { color: colors.textSecondary, fontFamily: typography.numbersRegular },
                    ]}
                  >
                    {typeSubtitle}
                  </Text>
                </View>

                {/* Edit Button beside the time */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setEditingStepIndex(null);
                    setClockModalVisible(true);
                  }}
                  style={[
                    styles.editTimeBtn,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.chip,
                    },
                  ]}
                  accessibilityLabel="Edit alarm time"
                >
                  <Edit3 size={14} color={colors.accent} strokeWidth={2.4} />
                  <Text
                    style={[
                      styles.editTimeBtnText,
                      { color: colors.textPrimary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    {language === 'bn' ? 'এডিট' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Alarm Label / Name */}
              <View style={styles.sectionContainer}>
                <Text
                  style={[
                    styles.sectionHeading,
                    { color: colors.textSecondary, fontFamily: typography.numbersBold },
                  ]}
                >
                  {t.alarmLabelPlaceholder.toUpperCase()}
                </Text>
                <TextInput
                  value={label}
                  onChangeText={setLabel}
                  placeholder={t.alarmLabelPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      color: colors.textPrimary,
                      borderRadius: radii.buttonMedium,
                      fontFamily: typography.numbersRegular,
                    },
                  ]}
                />
              </View>

              {/* Category Tag Selector */}
              {categories.length > 0 && (
                <View style={styles.sectionContainer}>
                  <Text
                    style={[
                      styles.sectionHeading,
                      { color: colors.textSecondary, fontFamily: typography.numbersBold },
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
                          backgroundColor: !category ? colors.accent : colors.surface,
                          borderColor: !category ? colors.accent : colors.surfaceBorder,
                          borderRadius: radii.pill,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          {
                            color: !category ? '#FFFFFF' : colors.textSecondary,
                            fontFamily: !category
                              ? typography.sansBold
                              : typography.sansMedium,
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
                              backgroundColor: isSelected
                                ? colors.accent
                                : colors.surface,
                              borderColor: isSelected
                                ? colors.accent
                                : colors.surfaceBorder,
                              borderRadius: radii.pill,
                            },
                          ]}
                        >
                          <Tag
                            size={11}
                            color={isSelected ? '#FFFFFF' : colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.categoryChipText,
                              {
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

              {/* Repeat Days */}
              <View style={styles.sectionContainer}>
                <View style={styles.repeatHeaderRow}>
                  <Text
                    style={[
                      styles.sectionHeading,
                      { color: colors.textSecondary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    {t.repeatLabel.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.repeatDaysSummary,
                      { color: colors.textMuted, fontFamily: typography.numbersRegular },
                    ]}
                  >
                    {formatRepeatDays(repeatDays)}
                  </Text>
                </View>

                <View style={styles.daysRow}>
                  {t.dayInitials.map((dayText, idx) => {
                    const isSelected = repeatDays.includes(idx);
                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        onPress={() => toggleDay(idx)}
                        style={[
                          styles.dayButton,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.surfaceBorder,
                            borderRadius: radii.chip,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayButtonText,
                            {
                              color: isSelected ? '#FFFFFF' : colors.textSecondary,
                              fontFamily: typography.numbersBold,
                            },
                          ]}
                        >
                          {dayText}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Interval Mode Switcher inside Edit Modal (Standard vs Escalating) for Multi-Alarm modes */}
              {alarmType !== 'single' && (
                <View style={styles.sectionContainer}>
                  <Text
                    style={[
                      styles.sectionHeading,
                      { color: colors.textSecondary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    {t.intervalAlarmTypeLabel.toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.modeToggleRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.chip,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleToggleEscalatingInEdit(false)}
                      style={[
                        styles.modeToggleTab,
                        !isEscalating && {
                          backgroundColor: colors.surfaceSubtle,
                          borderRadius: radii.chipInner,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modeToggleText,
                          {
                            color: !isEscalating ? colors.textPrimary : colors.textMuted,
                            fontFamily: typography.numbersBold,
                          },
                        ]}
                      >
                        {t.typeStandardShort}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleToggleEscalatingInEdit(true)}
                      style={[
                        styles.modeToggleTab,
                        isEscalating && {
                          backgroundColor: colors.primaryMuted,
                          borderRadius: radii.chipInner,
                        },
                      ]}
                    >
                      <Flame
                        size={14}
                        color={isEscalating ? colors.primary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.modeToggleText,
                          {
                            color: isEscalating ? colors.primaryLight : colors.textMuted,
                            fontFamily: typography.numbersBold,
                          },
                        ]}
                      >
                        {t.typeEscalatingShort}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Collapsible Granular Controls Dropdown (Controlled by Settings Toggle) */}
              {showAlarmSequenceSection && (
                <View style={styles.sectionContainer}>
                  <View
                    style={[
                      styles.dropdownCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isGranularOpen
                          ? colors.surfaceBorderHighlight
                          : colors.surfaceBorder,
                        borderRadius: radii.cardOuter,
                      },
                    ]}
                  >
                    {/* Dropdown Header */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setIsGranularOpen((prev) => !prev)}
                      style={styles.dropdownHeader}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isGranularOpen }}
                      accessibilityLabel={dropdownTitle}
                    >
                      <View
                        style={[
                          styles.dropdownIconBox,
                          {
                            backgroundColor: colors.primaryMuted,
                            borderRadius: radii.chip,
                          },
                        ]}
                      >
                        {isEscalating ? (
                          <Flame size={16} color={colors.accent} strokeWidth={2.2} />
                        ) : (
                          <SlidersHorizontal size={16} color={colors.accent} strokeWidth={2.2} />
                        )}
                      </View>

                      <View style={styles.dropdownHeaderTextCol}>
                        <Text
                          style={[
                            styles.dropdownTitleText,
                            { color: colors.textPrimary, fontFamily: typography.numbersBold },
                          ]}
                        >
                          {dropdownTitle}
                        </Text>
                        <Text
                          style={[
                            styles.dropdownSubtitleText,
                            { color: colors.textSecondary, fontFamily: typography.numbersRegular },
                          ]}
                        >
                          {dropdownSubtitle}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.dropdownChevronBadge,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            borderColor: colors.surfaceBorder,
                            borderRadius: radii.chip,
                          },
                        ]}
                      >
                        {isGranularOpen ? (
                          <ChevronUp size={16} color={colors.textPrimary} strokeWidth={2.4} />
                        ) : (
                          <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2.4} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Expanded Granular Controls Body */}
                    {isGranularOpen && (
                      <View
                        style={[
                          styles.dropdownBody,
                          { borderTopColor: colors.surfaceBorder },
                        ]}
                      >
                        {/* 1 & 2: Manual Step Count & Interval Steppers (Hidden in Escalating mode) */}
                        {!isEscalating && (
                          <>
                            <View style={styles.granularBlock}>
                              <Text
                                style={[
                                  styles.granularLabel,
                                  { color: colors.textSecondary, fontFamily: typography.numbersBold },
                                ]}
                              >
                                {t.alarmsCountLabel.toUpperCase()}
                              </Text>
                              <View
                                style={[
                                  styles.stepperContainer,
                                  {
                                    backgroundColor: colors.background,
                                    borderColor: colors.surfaceBorder,
                                    borderRadius: radii.buttonMedium,
                                  },
                                ]}
                              >
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  onPress={() => handleChangeTotalAlarms(-1)}
                                  disabled={totalStepCount <= 1}
                                  style={[
                                    styles.stepperBtn,
                                    totalStepCount <= 1 && { opacity: 0.35 },
                                  ]}
                                  accessibilityLabel="Decrease number of alarms"
                                >
                                  <Minus size={18} color={colors.textPrimary} strokeWidth={2.4} />
                                </TouchableOpacity>

                                <Text
                                  style={[
                                    styles.stepperValueText,
                                    { color: colors.textPrimary, fontFamily: typography.numbersBold },
                                  ]}
                                >
                                  {t.alarmsCountSummary(totalStepCount)}
                                </Text>

                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  onPress={() => handleChangeTotalAlarms(1)}
                                  disabled={totalStepCount >= 30}
                                  style={[
                                    styles.stepperBtn,
                                    totalStepCount >= 30 && { opacity: 0.35 },
                                  ]}
                                  accessibilityLabel="Increase number of alarms"
                                >
                                  <Plus size={18} color={colors.textPrimary} strokeWidth={2.4} />
                                </TouchableOpacity>
                              </View>
                            </View>

                            {(alarmType !== 'single' || totalStepCount > 1) && (
                              <View style={styles.granularBlock}>
                                <Text
                                  style={[
                                    styles.granularLabel,
                                    { color: colors.textSecondary, fontFamily: typography.numbersBold },
                                  ]}
                                >
                                  {t.intervalLabel.toUpperCase()}
                                </Text>
                                <View
                                  style={[
                                    styles.stepperContainer,
                                  {
                                    backgroundColor: colors.background,
                                    borderColor: colors.surfaceBorder,
                                    borderRadius: radii.buttonMedium,
                                  },
                                ]}
                              >
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  onPress={() => handleChangeIntervalMinutes(intervalMinutes - 1)}
                                  style={styles.stepperBtn}
                                  accessibilityLabel="Decrease interval minutes"
                                >
                                  <Minus size={18} color={colors.textPrimary} strokeWidth={2.4} />
                                </TouchableOpacity>

                                <Text
                                  style={[
                                    styles.stepperValueText,
                                    { color: colors.textPrimary, fontFamily: typography.numbersBold },
                                  ]}
                                >
                                  {t.everyNMin(intervalMinutes)}
                                </Text>

                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  onPress={() => handleChangeIntervalMinutes(intervalMinutes + 1)}
                                  style={styles.stepperBtn}
                                  accessibilityLabel="Increase interval minutes"
                                >
                                  <Plus size={18} color={colors.textPrimary} strokeWidth={2.4} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                          </>
                        )}

                        {/* 3. Individual Alarm Timings Header */}
                        <View style={styles.timingsHeaderRow}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text
                              style={[
                                styles.granularLabel,
                                {
                                  color: colors.textSecondary,
                                  fontFamily: typography.numbersBold,
                                  marginBottom: 2,
                                },
                              ]}
                            >
                              {t.alarmsActiveOfTotal(enabledStepCount, totalStepCount).toUpperCase()}
                            </Text>
                            <Text
                              style={[
                                styles.timingsHintText,
                                { color: colors.textMuted, fontFamily: typography.numbersRegular },
                              ]}
                            >
                              {t.alarmSequenceHint}
                            </Text>
                          </View>

                          {isStepsCustomized && (
                            <TouchableOpacity
                              activeOpacity={0.75}
                              onPress={handleResetCustomSteps}
                              style={[
                                styles.resetChipBtn,
                                {
                                  backgroundColor: colors.surfaceSubtle,
                                  borderColor: colors.surfaceBorder,
                                  borderRadius: radii.chip,
                                },
                              ]}
                              accessibilityLabel={t.resetCustomTimings}
                            >
                              <RotateCcw size={12} color={colors.textSecondary} strokeWidth={2.2} />
                              <Text
                                style={[
                                  styles.resetChipText,
                                  { color: colors.textSecondary, fontFamily: typography.numbersBold },
                                ]}
                              >
                                {t.resetCustomTimings}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* 4. Individual Timing Rows */}
                        <View style={styles.timingsList}>
                          {steps.map((step, idx) => {
                            const isStepOn = step.isEnabled;
                            const isLastActive = isStepOn && enabledStepCount <= 1;

                            return (
                              <View
                                key={`step_${idx}`}
                                style={[
                                  styles.timingRowCard,
                                  {
                                    backgroundColor: isStepOn ? colors.cardOnBg : colors.cardOffBg,
                                    borderColor: isStepOn
                                      ? colors.cardOnBorder
                                      : colors.cardOffBorder,
                                    borderRadius: radii.buttonMedium,
                                    opacity: isStepOn ? 1 : 0.6,
                                  },
                                ]}
                              >
                                {/* Step Index Pill */}
                                <View
                                  style={[
                                    styles.stepIndexBadge,
                                    {
                                      backgroundColor: isStepOn
                                        ? colors.primaryMuted
                                        : colors.surfaceSubtle,
                                      borderRadius: radii.chipInner,
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.stepIndexText,
                                      {
                                        color: isStepOn ? colors.accent : colors.textMuted,
                                        fontFamily: typography.numbersBold,
                                      },
                                    ]}
                                  >
                                    #{formatNum(idx + 1)}
                                  </Text>
                                </View>

                                {/* Pressable Time Value (Opens Radial Clock for this step) */}
                                <TouchableOpacity
                                  activeOpacity={0.75}
                                  onPress={() => {
                                    setEditingStepIndex(idx);
                                    setClockModalVisible(true);
                                  }}
                                  style={styles.stepTimeBtn}
                                  accessibilityLabel={`Edit alarm ${idx + 1} time`}
                                >
                                  <Text
                                    style={[
                                      styles.stepTimeText,
                                      {
                                        color: isStepOn ? colors.textPrimary : colors.textMuted,
                                        fontFamily: typography.numbersBold,
                                      },
                                    ]}
                                  >
                                    {formatTime12hLocal(step.hour, step.minute).full}
                                  </Text>
                                  <Edit3
                                    size={12}
                                    color={isStepOn ? colors.textSecondary : colors.textMuted}
                                    strokeWidth={2}
                                  />
                                </TouchableOpacity>

                                {/* Inline -1m / +1m Nudge Controls */}
                                <View
                                  style={[
                                    styles.nudgeGroup,
                                    {
                                      backgroundColor: colors.background,
                                      borderColor: colors.surfaceBorder,
                                      borderRadius: radii.chip,
                                    },
                                  ]}
                                >
                                  <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => handleNudgeStepTime(idx, -1)}
                                    style={styles.nudgeBtn}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 4 }}
                                    accessibilityLabel={`Subtract 1 minute from alarm ${idx + 1}`}
                                  >
                                    <Minus
                                      size={13}
                                      color={isStepOn ? colors.textSecondary : colors.textMuted}
                                      strokeWidth={2.4}
                                    />
                                  </TouchableOpacity>

                                  <Text
                                    style={[
                                      styles.nudgeUnitText,
                                      {
                                        color: colors.textMuted,
                                        fontFamily: typography.numbersRegular,
                                      },
                                    ]}
                                  >
                                    {formatNum(1)}m
                                  </Text>

                                  <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => handleNudgeStepTime(idx, 1)}
                                    style={styles.nudgeBtn}
                                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
                                    accessibilityLabel={`Add 1 minute to alarm ${idx + 1}`}
                                  >
                                    <Plus
                                      size={13}
                                      color={isStepOn ? colors.textSecondary : colors.textMuted}
                                      strokeWidth={2.4}
                                    />
                                  </TouchableOpacity>
                                </View>

                                {/* Individual Step ON/OFF Toggle */}
                                <TouchableOpacity
                                  activeOpacity={0.75}
                                  onPress={() => handleToggleStepEnabled(idx)}
                                  disabled={isLastActive}
                                  style={[
                                    styles.stepToggleBtn,
                                    {
                                      backgroundColor: isStepOn
                                        ? colors.squircleOnBg
                                        : colors.squircleOffBg,
                                      borderColor: isStepOn
                                        ? colors.squircleBorderOn
                                        : colors.squircleBorder,
                                      borderRadius: radii.chip,
                                    },
                                  ]}
                                  accessibilityRole="switch"
                                  accessibilityState={{ checked: isStepOn }}
                                  accessibilityLabel={`Alarm ${idx + 1} ${
                                    isStepOn ? 'enabled' : 'disabled'
                                  }`}
                                >
                                  {isStepOn ? (
                                    <Bell size={15} color={colors.squircleIconOn} strokeWidth={2.3} />
                                  ) : (
                                    <BellOff
                                      size={14}
                                      color={colors.squircleIconOff}
                                      strokeWidth={2}
                                    />
                                  )}
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Skip Next Occurrence & Duplicate Alarm Quick Actions */}
              {(onToggleSkipNext || onDuplicate) && (
                <View style={styles.quickActionRow}>
                  {onToggleSkipNext && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        safeHaptics.selectionAsync();
                        onToggleSkipNext(alarm.id);
                      }}
                      style={[
                        styles.quickActionBtn,
                        {
                          backgroundColor: alarm.skipNextDate
                            ? 'rgba(245, 158, 11, 0.14)'
                            : colors.surface,
                          borderColor: alarm.skipNextDate
                            ? 'rgba(245, 158, 11, 0.40)'
                            : colors.surfaceBorder,
                          borderRadius: radii.buttonMedium,
                        },
                      ]}
                    >
                      {alarm.skipNextDate ? (
                        <CalendarCheck size={15} color="#F59E0B" />
                      ) : (
                        <CalendarOff size={15} color={colors.textSecondary} />
                      )}
                      <Text
                        style={[
                          styles.quickActionBtnText,
                          {
                            color: alarm.skipNextDate ? '#F59E0B' : colors.textPrimary,
                            fontFamily: typography.sansBold,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {alarm.skipNextDate
                          ? `${t.resumeNextBtn} (${formatSkippedDateLabel(alarm.skipNextDate)})`
                          : t.skipNextBtn}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {onDuplicate && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        safeHaptics.selectionAsync();
                        onDuplicate(alarm.id);
                        onClose();
                      }}
                      style={[
                        styles.quickActionBtn,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.surfaceBorder,
                          borderRadius: radii.buttonMedium,
                        },
                      ]}
                    >
                      <Copy size={15} color={colors.accent} />
                      <Text
                        style={[
                          styles.quickActionBtnText,
                          { color: colors.textPrimary, fontFamily: typography.sansBold },
                        ]}
                        numberOfLines={1}
                      >
                        {t.duplicateAlarmBtn}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Delete Alarm Button */}
              {onDelete && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDelete}
                  style={[
                    styles.deleteAlarmBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: 'rgba(220, 96, 64, 0.25)',
                      borderRadius: radii.buttonMedium,
                    },
                  ]}
                >
                  <Trash2 size={16} color={colors.danger} strokeWidth={2.2} />
                  <Text
                    style={[
                      styles.deleteAlarmText,
                      { color: colors.danger, fontFamily: typography.numbersBold },
                    ]}
                  >
                    {t.delete}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Bottom Action Bar */}
            <View
              style={[
                styles.bottomActionBar,
                {
                  borderTopColor: colors.surfaceBorder,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={[
                  styles.bottomCancelBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radii.buttonMedium,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bottomCancelBtnText,
                    { color: colors.textSecondary, fontFamily: typography.numbersBold },
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
                    backgroundColor: colors.textPrimary,
                    borderRadius: radii.buttonMedium,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bottomSaveBtnText,
                    { color: colors.textOnPrimary, fontFamily: typography.numbersBold },
                  ]}
                >
                  {t.saveChanges}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Clock Edit Submodal (For macro time or individual step time) */}
      <ClockEditModal
        visible={clockModalVisible}
        initialType={editingStep ? 'single' : alarmType}
        initialStartHour={editingStep ? editingStep.hour : startHour}
        initialStartMinute={editingStep ? editingStep.minute : startMinute}
        initialEndHour={endHour}
        initialEndMinute={endMinute}
        initialOffsetDirection={offsetDirection}
        onClose={() => {
          setEditingStepIndex(null);
          setClockModalVisible(false);
        }}
        onConfirm={handleClockConfirm}
      />

      {/* Custom Styled Delete Confirmation Bottom Sheet Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View
          style={[
            styles.confirmBackdrop,
            { backgroundColor: colors.overlayBackdrop },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowDeleteConfirm(false)}
          />
          <Animated.View
            {...deleteConfirmGesture.dragHandlePanHandlers}
            style={[
              styles.confirmCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.surfaceBorder,
                borderTopLeftRadius: radii.modalOuter,
                borderTopRightRadius: radii.modalOuter,
                transform: [{ translateY: deleteConfirmGesture.translateY }],
              },
              shadows.modal,
            ]}
          >
            <View
              style={[
                styles.confirmDragHandle,
                {
                  backgroundColor: colors.surfaceBorder,
                  borderRadius: radii.handle,
                },
              ]}
            />
            <View
              style={[
                styles.confirmIconContainer,
                {
                  backgroundColor: colors.danger + '18',
                  borderRadius: radii.cardInner,
                },
              ]}
            >
              <Trash2 size={24} color={colors.danger} strokeWidth={2.2} />
            </View>

            <Text
              style={[
                styles.confirmTitle,
                { color: colors.textPrimary, fontFamily: typography.numbersBold },
              ]}
            >
              {language === 'bn' ? 'অ্যালার্ম মুছে ফেলবেন?' : 'Delete Alarm?'}
            </Text>

            <Text
              style={[
                styles.confirmMessage,
                { color: colors.textSecondary, fontFamily: typography.numbersRegular },
              ]}
            >
              {language === 'bn'
                ? 'মুছে ফেললে এই অ্যালার্মটি আর ফিরে পাওয়া যাবে না।'
                : 'Are you sure you want to delete this alarm? This action cannot be undone.'}
            </Text>

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowDeleteConfirm(false)}
                style={[
                  styles.confirmCancelBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radii.button,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.confirmCancelText,
                    { color: colors.textSecondary, fontFamily: typography.numbers },
                  ]}
                >
                  {t.cancel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  if (onDelete) {
                    onDelete(alarm.id);
                  }
                  onClose();
                }}
                style={[
                  styles.confirmDeleteBtn,
                  {
                    backgroundColor: colors.danger,
                    borderRadius: radii.button,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.confirmDeleteText,
                    { color: '#FFFFFF', fontFamily: typography.numbersBold },
                  ]}
                >
                  {t.delete}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
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
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  modeToggleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 3,
  },
  modeToggleTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modeToggleText: {
    fontSize: 13,
  },
  handleBar: {
    width: 40,
    height: 4,
  },
  timeCardBanner: {
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeCardTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  timeBannerValue: {
    fontSize: 22,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  timeBannerType: {
    fontSize: 12,
  },
  editTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  editTimeBtnText: {
    fontSize: 13,
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
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
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  quickActionBtnText: {
    fontSize: 12.5,
  },
  repeatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  repeatDaysSummary: {
    fontSize: 12,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayButtonText: {
    fontSize: 13,
  },
  dropdownCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  dropdownIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownHeaderTextCol: {
    flex: 1,
  },
  dropdownTitleText: {
    fontSize: 14,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  dropdownSubtitleText: {
    fontSize: 12,
  },
  dropdownChevronBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dropdownBody: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  granularBlock: {
    marginBottom: 14,
  },
  granularLabel: {
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
    paddingVertical: 4,
  },
  stepperBtn: {
    padding: 8,
  },
  stepperValueText: {
    fontSize: 15,
  },
  timingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 2,
  },
  timingsHintText: {
    fontSize: 11,
  },
  resetChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  resetChipText: {
    fontSize: 11,
  },
  timingsList: {
    gap: 8,
  },
  timingRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  stepIndexBadge: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    fontSize: 11,
  },
  stepTimeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  stepTimeText: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
  nudgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 4,
    height: 32,
  },
  nudgeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeUnitText: {
    fontSize: 11,
    paddingHorizontal: 2,
  },
  stepToggleBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 14,
    borderWidth: 1,
  },
  deleteAlarmText: {
    fontSize: 14,
  },
  bottomActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  bottomCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  bottomCancelBtnText: {
    fontSize: 15,
  },
  bottomSaveBtn: {
    flex: 1.8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSaveBtnText: {
    fontSize: 15,
  },
  confirmBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  confirmCard: {
    width: '100%',
    borderTopWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  confirmDragHandle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    marginBottom: 16,
  },
  confirmIconContainer: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 15,
  },
  confirmDeleteBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 15,
  },
});
