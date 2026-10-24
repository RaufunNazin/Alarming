import React, { useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Modal,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Flame,
  Trash2,
  Edit3,
  Copy,
  CalendarOff,
  CalendarCheck,
  Tag,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useTranslation } from '../../../core/i18n/translations';
import { AlarmItem } from '../types';
import {
  formatAlarmTimeDisplay,
  formatSkippedDateLabel,
  getAlarmSteps,
  getSmartScheduleString,
} from '../engine/intervalEngine';
import { SquircleToggleButton } from './SquircleToggleButton';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

interface AlarmCardItemProps {
  alarm: AlarmItem;
  onPressCard: (alarm: AlarmItem) => void;
  onToggle: (id: string) => void;
  onSwipeDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleSkipNext?: (id: string) => void;
}

const useNativeDriver = Platform.OS !== 'web';
const SWIPE_TRIGGER_THRESHOLD = 110;

export const AlarmCardItem: React.FC<AlarmCardItemProps> = React.memo(function AlarmCardItem({
  alarm,
  onPressCard,
  onToggle,
  onSwipeDelete,
  onDuplicate,
  onToggleSkipNext,
}) {
  const { colors, typography, radii, shadows, spacing, themeMode } = useTheme();
  const { t, language } = useTranslation();

  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const hapticFiredRef = useRef(false);

  const scheduleStr = useMemo(
    () => getSmartScheduleString(alarm),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alarm, language]
  );
  const timeDisplay = useMemo(
    () => formatAlarmTimeDisplay(alarm),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alarm, language]
  );
  const trimmedLabel = alarm.label ? alarm.label.trim() : '';
  const stepsCount = useMemo(() => getAlarmSteps(alarm).length, [alarm]);
  const handleToggle = useCallback(() => {
    onToggle(alarm.id);
  }, [onToggle, alarm.id]);

  const springToZero = (cb?: () => void) => {
    Animated.spring(translateX, {
      toValue: 0,
      tension: 80,
      friction: 10,
      useNativeDriver,
    }).start(cb);
  };

  const triggerExitDelete = () => {
    safeHaptics.notificationAsync(safeHaptics.NotificationFeedbackType.Warning);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -400,
        duration: 210,
        useNativeDriver,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver,
      }),
    ]).start(() => {
      onSwipeDelete?.(alarm.id);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;
      },
      onPanResponderGrant: () => {
        hapticFiredRef.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        const nextX = Math.max(-220, Math.min(180, gestureState.dx));
        translateX.setValue(nextX);

        if (!hapticFiredRef.current && Math.abs(nextX) >= SWIPE_TRIGGER_THRESHOLD) {
          hapticFiredRef.current = true;
          safeHaptics.selectionAsync();
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalX = gestureState.dx;
        if (finalX < -SWIPE_TRIGGER_THRESHOLD && onSwipeDelete) {
          triggerExitDelete();
        } else if (finalX > SWIPE_TRIGGER_THRESHOLD) {
          safeHaptics.selectionAsync();
          springToZero(() => onPressCard(alarm));
        } else {
          springToZero();
        }
      },
      onPanResponderTerminate: () => {
        springToZero();
      },
    })
  ).current;

  const handleCardPress = () => {
    safeHaptics.selectionAsync();
    onPressCard(alarm);
  };

  const handleCardLongPress = () => {
    safeHaptics.impactAsync(safeHaptics.ImpactFeedbackStyle.Medium);
    setShowQuickMenu(true);
  };

  const renderModeSubtitle = () => {
    if (alarm.type === 'single') return null;

    if (alarm.isEscalating) {
      const badgeLabel =
        alarm.type === 'offset'
          ? alarm.offsetDirection === 'after'
            ? t.escalatingAfterBadge
            : t.escalatingBeforeBadge
          : t.escalatingBadge;
      return (
        <View style={styles.modeSubRow}>
          <Flame size={12} color={colors.primary} />
          <Text
            style={[
              styles.modeSubText,
              {
                color: alarm.isEnabled ? colors.primaryLight : colors.textMuted,
                fontFamily: typography.sansMedium,
              },
            ]}
          >
            {badgeLabel} • {t.alarmsCountSummary(stepsCount)}
          </Text>
        </View>
      );
    }

    const modeDesc =
      alarm.type === 'interval'
        ? t.everyNMinBadge(alarm.intervalMinutes || 10)
        : alarm.offsetDirection === 'after'
          ? t.afterBadge(alarm.alarmCount || 10, alarm.intervalMinutes || 10)
          : t.beforeBadge(alarm.alarmCount || 10, alarm.intervalMinutes || 10);

    return (
      <View style={styles.modeSubRow}>
        <Text
          style={[
            styles.modeSubText,
            {
              color: alarm.isEnabled ? colors.textSecondary : colors.textMuted,
              fontFamily: typography.sansRegular,
            },
          ]}
        >
          {modeDesc} • {t.alarmsCountSummary(stepsCount)}
        </Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={{
        marginHorizontal: spacing.lg,
        marginVertical: 6,
        opacity: cardOpacity,
      }}
    >
      <View style={styles.swipeWrapper}>
        {/* Foreground Swipeable Card */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.cardContainer,
            shadows.card,
            {
              backgroundColor: alarm.isEnabled ? colors.cardOnBg : colors.cardOffBg,
              borderColor: alarm.isEnabled ? colors.cardOnBorder : colors.cardOffBorder,
              borderRadius: radii.cardOuter,
              paddingVertical: 18,
              paddingHorizontal: 18,
              opacity: themeMode === 'dark' ? (alarm.isEnabled ? 1 : 0.65) : 1,
              transform: [{ translateX }],
            },
          ]}
        >
          <View style={styles.contentRow}>
            {/* Left Info Column (Pressable to open Edit Modal, Long-press for Quick Actions) */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCardPress}
              onLongPress={handleCardLongPress}
              delayLongPress={320}
              style={styles.infoColPressable}
            >
              {/* Top row: Schedule • Label • Category Tag */}
              <View style={styles.topInfoRow}>
                <Text
                  style={[
                    styles.scheduleText,
                    {
                      color: alarm.isEnabled ? colors.textPrimary : colors.textMuted,
                      fontFamily: typography.numbersBold,
                    },
                  ]}
                >
                  {scheduleStr}
                </Text>
                {trimmedLabel ? (
                  <>
                    <Text
                      style={[
                        styles.separatorDot,
                        { color: colors.textMuted },
                      ]}
                    >
                      •
                    </Text>
                    <Text
                      style={[
                        styles.labelText,
                        {
                          color: alarm.isEnabled ? colors.textSecondary : colors.textMuted,
                          fontFamily: typography.numbersRegular,
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {trimmedLabel}
                    </Text>
                  </>
                ) : null}

                {alarm.category ? (
                  <View
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: colors.accentSoft,
                        borderColor: colors.accent + '45',
                        borderRadius: radii.pill,
                      },
                    ]}
                  >
                    <Tag size={10} color={colors.accent} />
                    <Text
                      style={[
                        styles.categoryPillText,
                        { color: colors.accent, fontFamily: typography.sansBold },
                      ]}
                    >
                      {alarm.category}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Time Display */}
              <Text
                style={[
                  styles.largeTimeText,
                  {
                    fontSize: 22,
                    lineHeight: 28,
                    color: alarm.isEnabled ? colors.textPrimary : colors.textMuted,
                    fontFamily: typography.numbersBold,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {timeDisplay}
              </Text>

              {renderModeSubtitle()}

              {/* Skip Next Occurrence Visible Indicator */}
              {alarm.skipNextDate ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    safeHaptics.selectionAsync();
                    onToggleSkipNext?.(alarm.id);
                  }}
                  style={[
                    styles.skipBadge,
                    {
                      backgroundColor: 'rgba(245, 158, 11, 0.14)',
                      borderColor: 'rgba(245, 158, 11, 0.40)',
                      borderRadius: radii.pill,
                    },
                  ]}
                >
                  <CalendarOff size={11} color="#F59E0B" />
                  <Text
                    style={[
                      styles.skipBadgeText,
                      { color: '#F59E0B', fontFamily: typography.sansBold },
                    ]}
                  >
                    {t.skippingNextPrefix} {formatSkippedDateLabel(alarm.skipNextDate)}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>

            {/* Right Sibling: Squircle Toggle Button */}
            <View style={styles.toggleWrapper}>
              <SquircleToggleButton isEnabled={alarm.isEnabled} onToggle={handleToggle} />
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Bespoke Quick Actions Modal on Card Long-Press */}
      {showQuickMenu && (
      <Modal
        visible={showQuickMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickMenu(false)}
      >
        <View style={styles.modalBackdrop}>
          <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowQuickMenu(false)}
          />
          <View
            style={[
              styles.quickSheet,
              shadows.modal,
              {
                backgroundColor: colors.modalSurface,
                borderColor: colors.surfaceBorder,
                borderRadius: radii.cardOuter,
              },
            ]}
          >
            <View style={styles.quickHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.quickTitle,
                    { color: colors.textPrimary, fontFamily: typography.numbersBold },
                  ]}
                >
                  {timeDisplay}
                </Text>
                <Text
                  style={[
                    styles.quickSubtitle,
                    { color: colors.textSecondary, fontFamily: typography.sansRegular },
                  ]}
                >
                  {trimmedLabel || scheduleStr}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowQuickMenu(false)}
                style={[
                  styles.closeIconBtn,
                  { backgroundColor: colors.surfaceSubtle, borderRadius: radii.pill },
                ]}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Skip / Resume Next Occurrence */}
            {onToggleSkipNext && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  safeHaptics.selectionAsync();
                  setShowQuickMenu(false);
                  onToggleSkipNext(alarm.id);
                }}
                style={[
                  styles.quickOptionRow,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radii.button,
                  },
                ]}
              >
                {alarm.skipNextDate ? (
                  <CalendarCheck size={18} color={colors.accent} />
                ) : (
                  <CalendarOff size={18} color="#F59E0B" />
                )}
                <Text
                  style={[
                    styles.quickOptionText,
                    { color: colors.textPrimary, fontFamily: typography.sansMedium },
                  ]}
                >
                  {alarm.skipNextDate ? t.resumeNextBtn : t.skipNextBtn}
                </Text>
              </TouchableOpacity>
            )}

            {/* Duplicate / Clone Alarm */}
            {onDuplicate && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  safeHaptics.selectionAsync();
                  setShowQuickMenu(false);
                  onDuplicate(alarm.id);
                }}
                style={[
                  styles.quickOptionRow,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radii.button,
                  },
                ]}
              >
                <Copy size={18} color={colors.accent} />
                <Text
                  style={[
                    styles.quickOptionText,
                    { color: colors.textPrimary, fontFamily: typography.sansMedium },
                  ]}
                >
                  {t.duplicateAlarmBtn}
                </Text>
              </TouchableOpacity>
            )}

            {/* Edit Alarm */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                safeHaptics.selectionAsync();
                setShowQuickMenu(false);
                onPressCard(alarm);
              }}
              style={[
                styles.quickOptionRow,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.button,
                },
              ]}
            >
              <Edit3 size={18} color={colors.textPrimary} />
              <Text
                style={[
                  styles.quickOptionText,
                  { color: colors.textPrimary, fontFamily: typography.sansMedium },
                ]}
              >
                {t.swipeEditBtn}
              </Text>
            </TouchableOpacity>

            {/* Delete Alarm */}
            {onSwipeDelete && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowQuickMenu(false);
                  triggerExitDelete();
                }}
                style={[
                  styles.quickOptionRow,
                  {
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    borderColor: 'rgba(239, 68, 68, 0.30)',
                    borderRadius: radii.button,
                  },
                ]}
              >
                <Trash2 size={18} color={colors.danger} />
                <Text
                  style={[
                    styles.quickOptionText,
                    { color: colors.danger, fontFamily: typography.sansBold },
                  ]}
                >
                  {t.swipeDeleteBtn}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  swipeWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  cardContainer: {
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoColPressable: {
    flex: 1,
    paddingRight: 14,
  },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
    gap: 4,
  },
  scheduleText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  separatorDot: {
    marginHorizontal: 3,
    fontSize: 13,
  },
  labelText: {
    fontSize: 13,
    flexShrink: 1,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    marginLeft: 4,
  },
  categoryPillText: {
    fontSize: 10.5,
  },
  largeTimeText: {
    letterSpacing: 0.2,
  },
  modeSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  modeSubText: {
    fontSize: 12,
  },
  skipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    marginTop: 7,
  },
  skipBadgeText: {
    fontSize: 11,
  },
  toggleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  quickSheet: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderWidth: 1,
    gap: 10,
  },
  quickHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quickTitle: {
    fontSize: 20,
  },
  quickSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  quickOptionText: {
    fontSize: 14,
  },
});
