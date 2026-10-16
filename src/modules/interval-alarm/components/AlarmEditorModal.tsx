import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Sparkles, Minus, Plus, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../core/theme';
import { AlarmItem, AlarmType } from '../types';
import { GoogleRadialClock } from './GoogleRadialClock';
import {
  formatTime12h,
  generateIntervalSequence,
  formatRepeatDays,
} from '../engine/intervalEngine';
import { calculateSnappedEndTime } from '../engine/snapHelper';

interface AlarmEditorModalProps {
  visible: boolean;
  initialAlarm?: AlarmItem | null;
  onClose: () => void;
  onSave: (alarmData: Omit<AlarmItem, 'id'>) => void;
  onDelete?: (id: string) => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const AlarmEditorModal: React.FC<AlarmEditorModalProps> = ({
  visible,
  initialAlarm,
  onClose,
  onSave,
  onDelete,
}) => {
  const { colors, typography, radii, spacing, shadows } = useTheme();

  // State
  const [alarmType, setAlarmType] = useState<AlarmType>('interval');
  const [activeTimeTab, setActiveTimeTab] = useState<'start' | 'end'>('start');

  const [startHour, setStartHour] = useState(6);
  const [startMinute, setStartMinute] = useState(30);

  const [endHour, setEndHour] = useState(7);
  const [endMinute, setEndMinute] = useState(30);

  const [label, setLabel] = useState('');
  const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]); // default weekdays
  const [intervalMinutes, setIntervalMinutes] = useState(10);

  // Sync initial alarm
  useEffect(() => {
    if (visible) {
      if (initialAlarm) {
        setAlarmType(initialAlarm.type);
        setStartHour(initialAlarm.startHour);
        setStartMinute(initialAlarm.startMinute);
        setEndHour(initialAlarm.endHour ?? (initialAlarm.startHour + 1) % 24);
        setEndMinute(initialAlarm.endMinute ?? initialAlarm.startMinute);
        setLabel(initialAlarm.label || '');
        setRepeatDays(initialAlarm.repeatDays || []);
        setIntervalMinutes(initialAlarm.intervalMinutes || 10);
      } else {
        // Defaults for new alarm
        setAlarmType('interval');
        setStartHour(6);
        setStartMinute(30);
        setEndHour(7);
        setEndMinute(30);
        setLabel('');
        setRepeatDays([1, 2, 3, 4, 5]);
        setIntervalMinutes(10);
      }
      setActiveTimeTab('start');
    }
  }, [visible, initialAlarm]);

  const handleTimeChange = (hour: number, minute: number) => {
    if (activeTimeTab === 'start' || alarmType === 'single') {
      setStartHour(hour);
      setStartMinute(minute);
    } else {
      setEndHour(hour);
      setEndMinute(minute);
    }
  };

  const toggleDay = (dayIndex: number) => {
    Haptics.selectionAsync();
    if (repeatDays.includes(dayIndex)) {
      setRepeatDays(repeatDays.filter((d) => d !== dayIndex));
    } else {
      setRepeatDays([...repeatDays, dayIndex].sort());
    }
  };

  // Interval snap calculation
  const snapped = calculateSnappedEndTime(
    startHour,
    startMinute,
    endHour,
    endMinute,
    intervalMinutes
  );

  const isUneven =
    alarmType === 'interval' &&
    (snapped.snappedHour !== endHour || snapped.snappedMinute !== endMinute);

  const handleApplySnap = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEndHour(snapped.snappedHour);
    setEndMinute(snapped.snappedMinute);
  };

  const sequence =
    alarmType === 'interval'
      ? generateIntervalSequence(
          startHour,
          startMinute,
          endHour,
          endMinute,
          intervalMinutes
        )
      : [];

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      type: alarmType,
      label: label.trim() || (alarmType === 'interval' ? 'Morning Wakeup' : 'Alarm'),
      isEnabled: true,
      startHour,
      startMinute,
      endHour: alarmType === 'interval' ? endHour : undefined,
      endMinute: alarmType === 'interval' ? endMinute : undefined,
      intervalMinutes: alarmType === 'interval' ? intervalMinutes : undefined,
      repeatDays,
      isOneOff: repeatDays.length === 0,
      generatedSequence:
        alarmType === 'interval' ? sequence.map((s) => s.timeString) : undefined,
      dismissedForToday: false,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!initialAlarm || !onDelete) return;
    Alert.alert('Delete Alarm', 'Are you sure you want to delete this alarm?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete(initialAlarm.id);
          onClose();
        },
      },
    ]);
  };

  const currentDialHour =
    activeTimeTab === 'start' || alarmType === 'single' ? startHour : endHour;
  const currentDialMinute =
    activeTimeTab === 'start' || alarmType === 'single' ? startMinute : endMinute;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlayBackdrop }]}>
        <View
          style={[
            styles.modalContent,
            shadows.modal,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.surfaceBorder,
              borderRadius: radii.modalOuter,
            },
          ]}
        >
          {/* Header Action Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text
                style={[
                  styles.cancelBtnText,
                  { color: colors.textMuted, fontFamily: typography.numbersRegular },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <Text
              style={[
                styles.modalTitle,
                { color: colors.textPrimary, fontFamily: typography.numbersBold },
              ]}
            >
              {initialAlarm ? 'Edit Alarm' : 'Set Alarm'}
            </Text>

            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.buttonMedium,
                },
              ]}
            >
              <Text
                style={[
                  styles.saveBtnText,
                  { color: colors.textOnPrimary, fontFamily: typography.numbersBold },
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.xxxl }}
          >
            {/* Top Segmented Type Selector */}
            <View
              style={[
                styles.segmentedType,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.chip,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAlarmType('single');
                  setActiveTimeTab('start');
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.typeSegment,
                  alarmType === 'single' && {
                    backgroundColor: colors.primary,
                    borderRadius: radii.chip - 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    {
                      color:
                        alarmType === 'single'
                          ? colors.textOnPrimary
                          : colors.textSecondary,
                      fontFamily: typography.numbersBold,
                    },
                  ]}
                >
                  Single Alarm
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAlarmType('interval');
                  Haptics.selectionAsync();
                }}
                style={[
                  styles.typeSegment,
                  alarmType === 'interval' && {
                    backgroundColor: colors.primary,
                    borderRadius: radii.chip - 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    {
                      color:
                        alarmType === 'interval'
                          ? colors.textOnPrimary
                          : colors.textSecondary,
                      fontFamily: typography.numbersBold,
                    },
                  ]}
                >
                  Interval Alarm
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sequence 1: Time Window Selector */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.textSecondary, fontFamily: typography.numbersBold },
                ]}
              >
                1. TIME WINDOW
              </Text>

              {alarmType === 'interval' ? (
                <View style={styles.timeTabsRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setActiveTimeTab('start');
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.timeTab,
                      {
                        backgroundColor:
                          activeTimeTab === 'start'
                            ? colors.amPmActiveBg
                            : colors.surfaceSubtle,
                        borderColor:
                          activeTimeTab === 'start'
                            ? colors.primary
                            : colors.surfaceBorder,
                        borderRadius: radii.timeBox,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeTabSub,
                        { color: colors.textSecondary, fontFamily: typography.numbersRegular },
                      ]}
                    >
                      START TIME
                    </Text>
                    <Text
                      style={[
                        styles.timeTabVal,
                        {
                          color:
                            activeTimeTab === 'start'
                              ? colors.primary
                              : colors.textPrimary,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      {formatTime12h(startHour, startMinute)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setActiveTimeTab('end');
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.timeTab,
                      {
                        backgroundColor:
                          activeTimeTab === 'end'
                            ? colors.amPmActiveBg
                            : colors.surfaceSubtle,
                        borderColor:
                          activeTimeTab === 'end'
                            ? colors.primary
                            : colors.surfaceBorder,
                        borderRadius: radii.timeBox,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeTabSub,
                        { color: colors.textSecondary, fontFamily: typography.numbersRegular },
                      ]}
                    >
                      END TIME
                    </Text>
                    <Text
                      style={[
                        styles.timeTabVal,
                        {
                          color:
                            activeTimeTab === 'end'
                              ? colors.primary
                              : colors.textPrimary,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      {formatTime12h(endHour, endMinute)}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={[
                    styles.singleTimeBox,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.timeBox,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timeTabSub,
                      { color: colors.textSecondary, fontFamily: typography.numbersRegular },
                    ]}
                  >
                    ALARM TIME
                  </Text>
                  <Text
                    style={[
                      styles.timeTabVal,
                      { color: colors.primary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    {formatTime12h(startHour, startMinute)}
                  </Text>
                </View>
              )}
            </View>

            {/* Sequence 2: Clock Dial & 12H Display (exact imansync styling) */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.textSecondary, fontFamily: typography.numbersBold },
                ]}
              >
                2. CLOCK DIAL ({activeTimeTab === 'start' || alarmType === 'single' ? 'START' : 'END'})
              </Text>
              <GoogleRadialClock
                selectedHour={currentDialHour}
                selectedMinute={currentDialMinute}
                onTimeChange={handleTimeChange}
              />
            </View>

            {/* Sequence 3: Label */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: colors.textSecondary, fontFamily: typography.numbersBold },
                ]}
              >
                3. LABEL
              </Text>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder={
                  alarmType === 'interval'
                    ? 'e.g. Morning Wakeup'
                    : 'e.g. Doctor Appointment'
                }
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.labelInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.surfaceBorder,
                    color: colors.textPrimary,
                    borderRadius: radii.modalInnerContainer,
                    fontFamily: typography.numbersRegular,
                  },
                ]}
                maxLength={40}
              />
            </View>

            {/* Sequence 4: Repeat Days */}
            <View style={styles.section}>
              <View style={styles.repeatHeaderRow}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.textSecondary, fontFamily: typography.numbersBold },
                  ]}
                >
                  4. REPEAT
                </Text>
                <Text
                  style={[
                    styles.repeatSummaryText,
                    { color: colors.textMuted, fontFamily: typography.numbersRegular },
                  ]}
                >
                  {formatRepeatDays(repeatDays)}
                </Text>
              </View>

              <View style={styles.daysRow}>
                {DAY_LABELS.map((dayName, idx) => {
                  const isSelected = repeatDays.includes(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.7}
                      onPress={() => toggleDay(idx)}
                      style={[
                        styles.dayCircle,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.surfaceSubtle,
                          borderColor: isSelected
                            ? colors.primaryLight
                            : colors.surfaceBorder,
                          borderRadius: radii.chip,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: isSelected
                              ? colors.textOnPrimary
                              : colors.textSecondary,
                            fontFamily: typography.numbersBold,
                          },
                        ]}
                      >
                        {dayName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sequence 5: Interval Setup (only for interval alarms) */}
            {alarmType === 'interval' && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.textSecondary, fontFamily: typography.numbersBold },
                  ]}
                >
                  5. INTERVAL
                </Text>

                {/* Quick Chips + Custom Stepper */}
                <View style={styles.intervalRow}>
                  {[5, 10, 20].map((mins) => {
                    const isSelected = intervalMinutes === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        activeOpacity={0.8}
                        onPress={() => {
                          setIntervalMinutes(mins);
                          Haptics.selectionAsync();
                        }}
                        style={[
                          styles.intervalChip,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.surfaceSubtle,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.surfaceBorder,
                            borderRadius: radii.chip,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.intervalChipText,
                            {
                              color: isSelected
                                ? colors.textOnPrimary
                                : colors.textPrimary,
                              fontFamily: typography.numbersBold,
                            },
                          ]}
                        >
                          {mins}m
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Custom Minute Stepper */}
                  <View
                    style={[
                      styles.stepperContainer,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.chip,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setIntervalMinutes((prev) => Math.max(1, prev - 1));
                        Haptics.selectionAsync();
                      }}
                      style={styles.stepperBtn}
                    >
                      <Minus size={14} color={colors.textPrimary} strokeWidth={2.4} />
                    </TouchableOpacity>

                    <Text
                      style={[
                        styles.stepperVal,
                        { color: colors.primary, fontFamily: typography.numbersBold },
                      ]}
                    >
                      {intervalMinutes}m
                    </Text>

                    <TouchableOpacity
                      onPress={() => {
                        setIntervalMinutes((prev) => Math.min(60, prev + 1));
                        Haptics.selectionAsync();
                      }}
                      style={styles.stepperBtn}
                    >
                      <Plus size={14} color={colors.textPrimary} strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Live Sequence Badge */}
                <View style={styles.sequenceBadgeRow}>
                  <Text
                    style={[
                      styles.sequenceBadgeText,
                      { color: colors.textSecondary, fontFamily: typography.numbersRegular },
                    ]}
                  >
                    Total: <Text style={{ fontFamily: typography.numbersBold }}>{sequence.length}</Text> alarms will ring every {intervalMinutes} min
                  </Text>
                </View>

                {/* 1-Tap Snap Helper */}
                {isUneven && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleApplySnap}
                    style={[
                      styles.snapPill,
                      {
                        backgroundColor: colors.amPmActiveBg,
                        borderColor: colors.primary,
                        borderRadius: radii.pill,
                      },
                    ]}
                  >
                    <Sparkles size={14} color={colors.primary} strokeWidth={2.2} />
                    <Text
                      style={[
                        styles.snapPillText,
                        { color: colors.primary, fontFamily: typography.numbersBold },
                      ]}
                    >
                      Snap end time to {formatTime12h(snapped.snappedHour, snapped.snappedMinute)} for {snapped.alarmCount} clean intervals
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Clean Delete Action at bottom of modal when editing */}
            {initialAlarm && onDelete && (
              <View style={styles.deleteSection}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleDelete}
                  style={[
                    styles.deleteAlarmBtn,
                    {
                      borderColor: colors.danger,
                      borderRadius: radii.buttonLarge,
                    },
                  ]}
                >
                  <Trash2 size={18} color={colors.danger} strokeWidth={2.2} />
                  <Text
                    style={[
                      styles.deleteAlarmBtnText,
                      { color: colors.danger, fontFamily: typography.numbersBold },
                    ]}
                  >
                    Delete Alarm
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
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
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    paddingTop: 16,
    paddingHorizontal: 18,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontSize: 15,
  },
  modalTitle: {
    fontSize: 18,
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  saveBtnText: {
    fontSize: 15,
  },
  segmentedType: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  typeSegment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 13,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  timeTabsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  singleTimeBox: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeTabSub: {
    fontSize: 11,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  timeTabVal: {
    fontSize: 20,
  },
  labelInput: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  repeatHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  repeatSummaryText: {
    fontSize: 12,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayCircle: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
  },
  intervalRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  intervalChip: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalChipText: {
    fontSize: 14,
  },
  stepperContainer: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepperBtn: {
    padding: 6,
  },
  stepperVal: {
    fontSize: 14,
  },
  sequenceBadgeRow: {
    marginTop: 4,
    marginBottom: 10,
  },
  sequenceBadgeText: {
    fontSize: 12,
  },
  snapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  snapPillText: {
    fontSize: 12,
  },
  deleteSection: {
    marginTop: 10,
    marginBottom: 16,
  },
  deleteAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    width: '100%',
  },
  deleteAlarmBtnText: {
    fontSize: 15,
  },
});
