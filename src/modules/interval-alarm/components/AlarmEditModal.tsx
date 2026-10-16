import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { Minus, Plus, Trash2, Edit3 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../../core/theme';
import { AlarmItem, AlarmType } from '../types';
import { ClockEditModal } from './ClockEditModal';
import {
  formatTime12h,
  generateIntervalSequence,
  generateOffsetSequence,
  formatRepeatDays,
} from '../engine/intervalEngine';

interface AlarmEditModalProps {
  visible: boolean;
  alarm: AlarmItem | null;
  onClose: () => void;
  onSave: (alarmData: Omit<AlarmItem, 'id'>) => void;
  onDelete?: (id: string) => void;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const AlarmEditModal: React.FC<AlarmEditModalProps> = ({
  visible,
  alarm,
  onClose,
  onSave,
  onDelete,
}) => {
  const { colors, typography, radii, shadows } = useTheme();

  // Internal alarm state
  const [alarmType, setAlarmType] = useState<AlarmType>('single');
  const [startHour, setStartHour] = useState(6);
  const [startMinute, setStartMinute] = useState(30);
  const [endHour, setEndHour] = useState(7);
  const [endMinute, setEndMinute] = useState(30);
  const [offsetDirection, setOffsetDirection] = useState<'before' | 'after'>('before');
  const [alarmCount, setAlarmCount] = useState(10);
  const [intervalMinutes, setIntervalMinutes] = useState(10);
  const [label, setLabel] = useState('');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);

  // Submodal state for clock editing
  const [clockModalVisible, setClockModalVisible] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (visible && alarm) {
      setAlarmType(alarm.type);
      setStartHour(alarm.startHour);
      setStartMinute(alarm.startMinute);
      setEndHour(alarm.endHour ?? (alarm.startHour + 1) % 24);
      setEndMinute(alarm.endMinute ?? alarm.startMinute);
      setOffsetDirection(alarm.offsetDirection || 'before');
      setAlarmCount(alarm.alarmCount || 10);
      setIntervalMinutes(alarm.intervalMinutes || 10);
      setLabel(alarm.label || '');
      setRepeatDays(alarm.repeatDays || []);
      setClockModalVisible(false);
      setShowDeleteConfirm(false);
    }
  }, [visible, alarm]);

  if (!alarm) return null;

  const toggleDay = (dayIndex: number) => {
    if (repeatDays.includes(dayIndex)) {
      setRepeatDays(repeatDays.filter((d) => d !== dayIndex));
    } else {
      setRepeatDays([...repeatDays, dayIndex].sort());
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
    setAlarmType(result.type);
    setStartHour(result.startHour);
    setStartMinute(result.startMinute);
    setEndHour(result.endHour);
    setEndMinute(result.endMinute);
    setOffsetDirection(result.offsetDirection);
    setClockModalVisible(false);
  };

  const handleSave = () => {
    let generatedSequence: string[] | undefined;

    if (alarmType === 'interval') {
      generatedSequence = generateIntervalSequence(
        startHour,
        startMinute,
        endHour,
        endMinute,
        intervalMinutes
      ).map((s) => s.timeString);
    } else if (alarmType === 'offset') {
      generatedSequence = generateOffsetSequence(
        startHour,
        startMinute,
        offsetDirection,
        alarmCount,
        intervalMinutes
      ).map((s) => s.timeString);
    }

    const timeOrConfigChanged =
      startHour !== alarm.startHour ||
      startMinute !== alarm.startMinute ||
      endHour !== (alarm.endHour ?? (alarm.startHour + 1) % 24) ||
      endMinute !== (alarm.endMinute ?? alarm.startMinute) ||
      intervalMinutes !== (alarm.intervalMinutes ?? 10) ||
      offsetDirection !== (alarm.offsetDirection ?? 'before') ||
      alarmCount !== (alarm.alarmCount ?? 10) ||
      alarmType !== alarm.type ||
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
      alarmCount: alarmType === 'offset' ? alarmCount : undefined,
      intervalMinutes: alarmType !== 'single' ? intervalMinutes : undefined,
      repeatDays,
      isOneOff: !repeatDays || repeatDays.length === 0,
      dismissedForToday: alarm.dismissedForToday,
      generatedSequence,
    };

    onSave(updatedAlarm);
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete) return;
    setShowDeleteConfirm(true);
  };

  const timeDisplayString =
    alarmType === 'interval'
      ? `${formatTime12h(startHour, startMinute)} – ${formatTime12h(endHour, endMinute)}`
      : formatTime12h(startHour, startMinute);

  const typeSubtitle =
    alarmType === 'interval'
      ? 'Window Interval'
      : alarmType === 'offset'
      ? `Offset • ${alarmCount} alarms ${offsetDirection}`
      : 'Single Alarm';

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlayBackdrop }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close edit modal"
          />

          <View
            style={[
              styles.modalContent,
              shadows.modal,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfaceBorder,
                borderTopLeftRadius: radii.modalOuter,
                borderTopRightRadius: radii.modalOuter,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Top Drag Handle (No header title or top buttons) */}
            <View style={styles.handleBar} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8, paddingTop: 4 }}
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
                  onPress={() => setClockModalVisible(true)}
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
                    Edit
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
                  LABEL
                </Text>
                <TextInput
                  value={label}
                  onChangeText={setLabel}
                  placeholder="Alarm name (optional)"
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

              {/* Repeat Days */}
              <View style={styles.sectionContainer}>
                <View style={styles.repeatHeaderRow}>
                  <Text
                    style={[
                      styles.sectionHeading,
                      { color: colors.textSecondary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    REPEAT ON
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
                  {DAY_LABELS.map((dayText, idx) => {
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
                              color: isSelected ? colors.textOnPrimary : colors.textSecondary,
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

              {/* Interval Length Stepper (For Window Interval or Offset Interval) */}
              {alarmType !== 'single' && (
                <View style={styles.sectionContainer}>
                  <Text
                    style={[
                      styles.sectionHeading,
                      { color: colors.textSecondary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    INTERVAL BETWEEN ALARMS
                  </Text>
                  <View
                    style={[
                      styles.stepperContainer,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.buttonMedium,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setIntervalMinutes(Math.max(1, intervalMinutes - 1))}
                      style={styles.stepperBtn}
                    >
                      <Minus size={18} color={colors.textPrimary} strokeWidth={2.4} />
                    </TouchableOpacity>

                    <Text
                      style={[
                        styles.stepperValueText,
                        { color: colors.textPrimary, fontFamily: typography.numbersBold },
                      ]}
                    >
                      {intervalMinutes} minutes
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setIntervalMinutes(Math.min(60, intervalMinutes + 1))}
                      style={styles.stepperBtn}
                    >
                      <Plus size={18} color={colors.textPrimary} strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Offset Alarm Count Stepper (For Offset only) */}
              {alarmType === 'offset' && (
                <View style={styles.sectionContainer}>
                  <Text
                    style={[
                      styles.sectionHeading,
                      { color: colors.textSecondary, fontFamily: typography.numbersBold },
                    ]}
                  >
                    NUMBER OF ALARMS
                  </Text>
                  <View
                    style={[
                      styles.stepperContainer,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.buttonMedium,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setAlarmCount(Math.max(2, alarmCount - 1))}
                      style={styles.stepperBtn}
                    >
                      <Minus size={18} color={colors.textPrimary} strokeWidth={2.4} />
                    </TouchableOpacity>

                    <Text
                      style={[
                        styles.stepperValueText,
                        { color: colors.textPrimary, fontFamily: typography.numbersBold },
                      ]}
                    >
                      {alarmCount} alarms
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setAlarmCount(Math.min(30, alarmCount + 1))}
                      style={styles.stepperBtn}
                    >
                      <Plus size={18} color={colors.textPrimary} strokeWidth={2.4} />
                    </TouchableOpacity>
                  </View>
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
                    Delete Alarm
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
                  Cancel
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
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clock Edit Submodal (Opened only when tapping 'Edit' beside the time) */}
      <ClockEditModal
        visible={clockModalVisible}
        initialType={alarmType}
        initialStartHour={startHour}
        initialStartMinute={startMinute}
        initialEndHour={endHour}
        initialEndMinute={endMinute}
        initialOffsetDirection={offsetDirection}
        onClose={() => setClockModalVisible(false)}
        onConfirm={handleClockConfirm}
      />

      {/* Custom Styled Delete Confirmation Modal with Frosted Blur Backdrop */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.confirmBackdrop}>
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowDeleteConfirm(false)}
          />
          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.surfaceBorder,
                borderRadius: radii.cardOuter,
              },
              shadows.card,
            ]}
          >
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
              Delete Alarm?
            </Text>

            <Text
              style={[
                styles.confirmMessage,
                { color: colors.textSecondary, fontFamily: typography.numbersRegular },
              ]}
            >
              Are you sure you want to delete this alarm? This action cannot be undone.
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
                  Cancel
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
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingTop: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
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
