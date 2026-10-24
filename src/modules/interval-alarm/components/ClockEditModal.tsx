import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Clock, Keyboard } from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useTranslation } from '../../../core/i18n/translations';
import { AlarmType } from '../types';
import { GoogleRadialClock } from './GoogleRadialClock';
import { getLiveDialParts } from '../engine/intervalEngine';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

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
  const { colors, typography, radii, shadows, themeMode } = useTheme();
  const { t, formatTime12h: formatTime12hLocal } = useTranslation();

  const alarmTabs: { key: AlarmType; label: string }[] = [
    { key: 'single', label: t.modeSingle },
    { key: 'interval', label: t.modeWindow },
    { key: 'offset', label: t.modeOffset },
  ];

  const [alarmType, setAlarmType] = useState<AlarmType>(initialType);
  const [activeTimeTab, setActiveTimeTab] = useState<'start' | 'end'>('start');
  const [dialResetKey, setDialResetKey] = useState(0);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
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
      setDialResetKey((k) => k + 1);
      setIsKeyboardMode(false);
      setStartHour(initialStartHour);
      setStartMinute(initialStartMinute);
      setEndHour(initialEndHour);
      setEndMinute(initialEndMinute);
      setOffsetDirection(initialOffsetDirection);
    }
  }

  const handleSelectTimeTab = (tab: 'start' | 'end') => {
    safeHaptics.selectionAsync();
    setActiveTimeTab(tab);
    setDialResetKey((k) => k + 1);
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
    safeHaptics.selectionAsync();
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

  const liveRingParts = useMemo(() => {
    if (!visible) return undefined;
    return getLiveDialParts({
      type: alarmType,
      startHour,
      startMinute,
      endHour,
      endMinute,
      offsetDirection,
    });
  }, [
    visible,
    alarmType,
    startHour,
    startMinute,
    endHour,
    endMinute,
    offsetDirection,
  ]);

  if (!visible) return null;

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
          <View
            style={[
              styles.handleBar,
              {
                backgroundColor:
                  themeMode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : colors.surfaceBorder,
              },
            ]}
          />

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
              {alarmTabs.map((tab) => {
                const isSelected = alarmType === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    activeOpacity={0.8}
                    onPress={() => {
                      setAlarmType(tab.key);
                      setActiveTimeTab('start');
                      setDialResetKey((k) => k + 1);
                    }}
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
              resetKey={dialResetKey}
              isKeyboardMode={isKeyboardMode}
              liveDurationParts={liveRingParts}
            />

            {/* Mode-Specific Controls Below Clock */}
            {alarmType === 'interval' && (
              <View style={styles.intervalTimesContainer}>
                <View style={styles.intervalCardRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSelectTimeTab('start')}
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
                      {t.startTime.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.timeCardValue,
                        { color: colors.textPrimary, fontFamily: typography.numbersBold },
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
                      {t.endTime.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.timeCardValue,
                        { color: colors.textPrimary, fontFamily: typography.numbersBold },
                      ]}
                    >
                      {formatTime12hLocal(endHour, endMinute).full}
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
                      {t.before}
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
                      {t.after}
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
              activeOpacity={0.8}
              onPress={() => {
                safeHaptics.selectionAsync();
                setIsKeyboardMode((v) => !v);
              }}
              accessibilityLabel={isKeyboardMode ? t.useDialTooltip : t.useKeyboardTooltip}
              style={[
                styles.bottomKeypadBtn,
                {
                  backgroundColor: isKeyboardMode ? colors.primary + '25' : colors.surface,
                  borderColor: isKeyboardMode ? colors.primary : colors.surfaceBorder,
                  borderRadius: radii.buttonMedium,
                },
              ]}
            >
              {isKeyboardMode ? (
                <Clock size={20} color={colors.primary} />
              ) : (
                <Keyboard size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>

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
                {t.selectTime}
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
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
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
