import React, { useState } from 'react';
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
import { AlarmType } from '../types';
import { GoogleRadialClock } from './GoogleRadialClock';
import { formatTime12h } from '../engine/intervalEngine';

interface ClockEditModalProps {
  visible: boolean;
  initialType: AlarmType;
  initialStartHour: number;
  initialStartMinute: number;
  initialEndHour: number;
  initialEndMinute: number;
  initialOffsetDirection?: 'before' | 'after';
  onClose: () => void;
  onConfirm: (result: {
    type: AlarmType;
    startHour: number;
    startMinute: number;
    endHour: number;
    endMinute: number;
    offsetDirection: 'before' | 'after';
  }) => void;
}

const ALARM_TABS: { key: AlarmType; label: string }[] = [
  { key: 'single', label: 'Single' },
  { key: 'interval', label: 'Window' },
  { key: 'offset', label: 'Offset' },
];

export const ClockEditModal: React.FC<ClockEditModalProps> = ({
  visible,
  initialType,
  initialStartHour,
  initialStartMinute,
  initialEndHour,
  initialEndMinute,
  initialOffsetDirection = 'before',
  onClose,
  onConfirm,
}) => {
  const { colors, typography, radii, shadows } = useTheme();

  const [alarmType, setAlarmType] = useState<AlarmType>(initialType);
  const [activeTimeTab, setActiveTimeTab] = useState<'start' | 'end'>('start');
  const [startHour, setStartHour] = useState(initialStartHour);
  const [startMinute, setStartMinute] = useState(initialStartMinute);
  const [endHour, setEndHour] = useState(initialEndHour);
  const [endMinute, setEndMinute] = useState(initialEndMinute);
  const [offsetDirection, setOffsetDirection] = useState<'before' | 'after'>(initialOffsetDirection);

  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setAlarmType(initialType);
      setActiveTimeTab('start');
      setStartHour(initialStartHour);
      setStartMinute(initialStartMinute);
      setEndHour(initialEndHour);
      setEndMinute(initialEndMinute);
      setOffsetDirection(initialOffsetDirection);
    }
  }

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
    onConfirm({
      type: alarmType,
      startHour,
      startMinute,
      endHour,
      endMinute,
      offsetDirection,
    });
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
          accessibilityLabel="Close clock editor"
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
          {/* Drag Handle */}
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
                    onPress={() => setAlarmType(tab.key)}
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
                Set Time
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
