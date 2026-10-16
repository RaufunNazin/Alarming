import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { useTheme } from '../../../core/theme';
import { AlarmItem, AlarmType } from '../types';
import { GoogleRadialClock } from './GoogleRadialClock';
import {
  formatTime12h,
  getNextHourTime,
  generateIntervalSequence,
  generateOffsetSequence,
} from '../engine/intervalEngine';
import { useAlarmStore } from '../store/alarmStore';

interface AlarmCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (alarmData: Omit<AlarmItem, 'id'>) => void;
}

const ALARM_TABS: { key: AlarmType; label: string }[] = [
  { key: 'single', label: 'Single' },
  { key: 'interval', label: 'Window' },
  { key: 'offset', label: 'Offset' },
];

export const AlarmCreationModal: React.FC<AlarmCreationModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const { colors, typography, radii, shadows } = useTheme();
  const lastSelectedType = useAlarmStore((s) => s.lastSelectedType);
  const setLastSelectedType = useAlarmStore((s) => s.setLastSelectedType);

  const [alarmType, setAlarmType] = useState<AlarmType>(lastSelectedType || 'single');
  const [activeTimeTab, setActiveTimeTab] = useState<'start' | 'end'>('start');
  const [startHour, setStartHour] = useState(12);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(13);
  const [endMinute, setEndMinute] = useState(0);
  const [offsetDirection, setOffsetDirection] = useState<'before' | 'after'>('before');
  const [alarmCount, setAlarmCount] = useState(10);
  const [intervalMinutes, setIntervalMinutes] = useState(10);

  // When opened, reset to next-hour defaults and last selected type
  useEffect(() => {
    if (visible) {
      const next = getNextHourTime();
      const currentType = useAlarmStore.getState().lastSelectedType || 'single';
      setAlarmType(currentType);
      setActiveTimeTab('start');
      setStartHour(next.hour);
      setStartMinute(next.minute);
      setEndHour((next.hour + 1) % 24);
      setEndMinute(next.minute);
      setOffsetDirection('before');
      setAlarmCount(10);
      setIntervalMinutes(currentType === 'offset' ? 5 : 10);
    }
  }, [visible]);

  const handleSelectType = (type: AlarmType) => {
    setAlarmType(type);
    setActiveTimeTab('start');
    if (type === 'offset' && intervalMinutes !== 5) {
      setIntervalMinutes(5);
    } else if (type === 'interval' && intervalMinutes !== 10) {
      setIntervalMinutes(10);
    }
    setLastSelectedType(type);
  };

  const handleTimeChange = (hour: number, minute: number) => {
    if (alarmType === 'interval' && activeTimeTab === 'end') {
      setEndHour(hour);
      setEndMinute(minute);
    } else {
      setStartHour(hour);
      setStartMinute(minute);
    }
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

    const defaultLabelText =
      alarmType === 'interval'
        ? 'Morning Wakeup'
        : alarmType === 'offset'
        ? 'Interval Wakeup'
        : 'Alarm';

    const newAlarm: Omit<AlarmItem, 'id'> = {
      type: alarmType,
      label: defaultLabelText,
      isEnabled: true,
      startHour,
      startMinute,
      endHour: alarmType === 'interval' ? endHour : undefined,
      endMinute: alarmType === 'interval' ? endMinute : undefined,
      offsetDirection: alarmType === 'offset' ? offsetDirection : undefined,
      alarmCount: alarmType === 'offset' ? alarmCount : undefined,
      intervalMinutes: alarmType !== 'single' ? intervalMinutes : undefined,
      repeatDays: [],
      isOneOff: false,
      dismissedForToday: false,
      generatedSequence,
    };

    onSave(newAlarm);
    onClose();
  };

  const currentDialHour =
    alarmType === 'interval' && activeTimeTab === 'end' ? endHour : startHour;
  const currentDialMinute =
    alarmType === 'interval' && activeTimeTab === 'end' ? endMinute : startMinute;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlayBackdrop }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close create modal"
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
          {/* Top Drag Handle (No header title or buttons) */}
          <View style={styles.handleBar} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8, paddingTop: 4 }}
          >
            {/* Alarm Type Switcher */}
            <View
              style={[
                styles.segmentedType,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.chip,
                },
              ]}
            >
              {ALARM_TABS.map((tab) => {
                const isSelected = alarmType === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    activeOpacity={0.8}
                    onPress={() => handleSelectType(tab.key)}
                    style={[
                      styles.typeSegment,
                      isSelected && {
                        backgroundColor: colors.surfaceSubtle,
                        borderRadius: radii.chip - 3,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeText,
                        {
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
            />

            {/* Mode-Specific Controls Below Clock */}
            {alarmType === 'interval' && (
              <View style={styles.intervalTimesContainer}>
                <View style={styles.intervalCardRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setActiveTimeTab('start')}
                    style={[
                      styles.timeSelectorCard,
                      {
                        backgroundColor:
                          activeTimeTab === 'start' ? colors.surfaceSubtle : colors.surface,
                        borderColor:
                          activeTimeTab === 'start' ? colors.primary : colors.surfaceBorder,
                        borderRadius: radii.buttonMedium,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeCardLabel,
                        { color: colors.textSecondary, fontFamily: typography.numbersBold },
                      ]}
                    >
                      START TIME
                    </Text>
                    <Text
                      style={[
                        styles.timeCardValue,
                        { color: colors.textPrimary, fontFamily: typography.numbersBold },
                      ]}
                    >
                      {formatTime12h(startHour, startMinute)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setActiveTimeTab('end')}
                    style={[
                      styles.timeSelectorCard,
                      {
                        backgroundColor:
                          activeTimeTab === 'end' ? colors.surfaceSubtle : colors.surface,
                        borderColor:
                          activeTimeTab === 'end' ? colors.primary : colors.surfaceBorder,
                        borderRadius: radii.buttonMedium,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeCardLabel,
                        { color: colors.textSecondary, fontFamily: typography.numbersBold },
                      ]}
                    >
                      END TIME
                    </Text>
                    <Text
                      style={[
                        styles.timeCardValue,
                        { color: colors.textPrimary, fontFamily: typography.numbersBold },
                      ]}
                    >
                      {formatTime12h(endHour, endMinute)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {alarmType === 'offset' && (
              <View style={styles.offsetOptionsContainer}>
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
                      offsetDirection === 'before' && {
                        backgroundColor: colors.surfaceSubtle,
                        borderRadius: radii.chip - 3,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.directionTabText,
                        {
                          color: offsetDirection === 'before' ? colors.textPrimary : colors.textMuted,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      Ring Before Target
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setOffsetDirection('after')}
                    style={[
                      styles.directionTab,
                      offsetDirection === 'after' && {
                        backgroundColor: colors.surfaceSubtle,
                        borderRadius: radii.chip - 3,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.directionTabText,
                        {
                          color: offsetDirection === 'after' ? colors.textPrimary : colors.textMuted,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      Ring After Target
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
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
});
