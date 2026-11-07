import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import {
  Flame,
  Trash2,
  Edit3,
  Copy,
  CalendarOff,
  CalendarCheck,
  Tag,
  Power,
} from 'lucide-react-native';
import { useTheme } from '../../../core/theme';
import { useTranslation } from '../../../core/i18n/translations';
import { AlarmItem } from '../types';
import {
  formatAlarmTimeDisplay,
  formatPauseStatusBadge,
  formatSkippedDateLabel,
  getAlarmSteps,
  getSmartScheduleString,
} from '../engine/intervalEngine';
import { SquircleToggleButton } from './SquircleToggleButton';
import { useSheetModalGesture } from './useSheetModalGesture';
import { safeHaptics } from '../../../core/haptics/safeHaptics';

interface AlarmCardItemProps {
  alarm: AlarmItem;
  nowMinuteKey?: number;
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
  nowMinuteKey,
  onPressCard,
  onToggle,
  onSwipeDelete,
  onDuplicate,
  onToggleSkipNext,
}) {
  const { colors, typography, radii, shadows, themeMode, responsive } = useTheme();
  const { t, language } = useTranslation();

  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const {
    translateY: quickMenuTranslateY,
    backdropOpacity: quickMenuBackdropOpacity,
    dragHandlePanHandlers,
    sheetPanHandlers,
    onSheetLayout,
  } = useSheetModalGesture(showQuickMenu, () => setShowQuickMenu(false));
  const translateX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const hapticFiredRef = useRef(false);

  // Ensure card position and opacity are reset if restored after undo
  useEffect(() => {
    translateX.setValue(0);
    cardOpacity.setValue(1);
  }, [alarm.id, translateX, cardOpacity]);

  const editHintOpacity = useMemo(
    () =>
      translateX.interpolate({
        inputRange: [0, 24, SWIPE_TRIGGER_THRESHOLD],
        outputRange: [0, 0.4, 1],
        extrapolate: 'clamp',
      }),
    [translateX]
  );

  const deleteHintOpacity = useMemo(
    () =>
      translateX.interpolate({
        inputRange: [-SWIPE_TRIGGER_THRESHOLD, -24, 0],
        outputRange: [1, 0.4, 0],
        extrapolate: 'clamp',
      }),
    [translateX]
  );

  const pauseStatusBadgeText = useMemo(
    () => formatPauseStatusBadge(alarm),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alarm, language, nowMinuteKey]
  );
  const isPausedOrDismissedToday = Boolean(pauseStatusBadgeText);
  const isEffectivelyEnabled = alarm.isEnabled && !isPausedOrDismissedToday;

  const scheduleStr = useMemo(
    () => getSmartScheduleString(alarm),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alarm, language, nowMinuteKey]
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
      onPanResponderTerminationRequest: (_, gestureState) =>
        Math.abs(gestureState.dx) < 24,
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

    const totalCustomSteps = alarm.customSteps?.length ?? 0;
    const countLabel =
      totalCustomSteps > 0 && stepsCount < totalCustomSteps
        ? t.alarmsActiveOfTotal(stepsCount, totalCustomSteps)
        : t.alarmsCountSummary(stepsCount);

    if (alarm.isEscalating) {
      const badgeLabel =
        alarm.type === 'offset'
          ? alarm.offsetDirection === 'after'
            ? t.escalatingAfterBadge
            : t.escalatingBeforeBadge
          : t.escalatingBadge;
      return (
        <View style={styles.modeSubRow}>
          <Flame size={Math.round(responsive.ms(12))} color={colors.primary} />
          <Text
            style={[
              styles.modeSubText,
              {
                fontSize: responsive.ms(12),
                color: isEffectivelyEnabled ? colors.primaryLight : colors.textMuted,
                fontFamily: typography.sansMedium,
              },
            ]}
          >
            {badgeLabel} • {countLabel}
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
              fontSize: responsive.ms(12),
              color: isEffectivelyEnabled ? colors.textSecondary : colors.textMuted,
              fontFamily: typography.sansRegular,
            },
          ]}
        >
          {modeDesc} • {countLabel}
        </Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={{
        marginHorizontal: responsive.screenPadding,
        marginVertical: responsive.s(5.5),
        opacity: cardOpacity,
      }}
    >
      <View style={styles.swipeWrapper}>
        {/* Visual Swipe Action Background Indicators */}
        <View
          pointerEvents="none"
          style={[
            styles.swipeActionBackground,
            {
              borderRadius: radii.cardOuter,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.swipeActionSide,
              styles.swipeActionLeft,
              {
                backgroundColor: colors.accentSoft,
                borderColor: colors.accent + '45',
                borderRadius: radii.cardOuter,
                opacity: editHintOpacity,
              },
            ]}
          >
            <Edit3 size={Math.round(responsive.ms(18))} color={colors.accent} />
            <Text
              style={[
                styles.swipeActionLabel,
                {
                  fontSize: responsive.ms(13),
                  color: colors.accent,
                  fontFamily: typography.sansBold,
                },
              ]}
            >
              {t.swipeEditBtn}
            </Text>
          </Animated.View>

          {onSwipeDelete && (
            <Animated.View
              style={[
                styles.swipeActionSide,
                styles.swipeActionRight,
                {
                  backgroundColor: 'rgba(239, 68, 68, 0.14)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  borderRadius: radii.cardOuter,
                  opacity: deleteHintOpacity,
                },
              ]}
            >
              <Text
                style={[
                  styles.swipeActionLabel,
                  {
                    fontSize: responsive.ms(13),
                    color: colors.danger,
                    fontFamily: typography.sansBold,
                  },
                ]}
              >
                {t.swipeDeleteBtn}
              </Text>
              <Trash2 size={Math.round(responsive.ms(18))} color={colors.danger} />
            </Animated.View>
          )}
        </View>

        {/* Foreground Swipeable Card */}
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.cardContainer,
            shadows.card,
            {
              backgroundColor: isEffectivelyEnabled ? colors.cardOnBg : colors.cardOffBg,
              borderColor: isEffectivelyEnabled
                ? colors.cardOnBorder
                : colors.cardOffBorder,
              borderRadius: radii.cardOuter,
              opacity: themeMode === 'dark' ? (isEffectivelyEnabled ? 1 : 0.65) : 1,
              transform: [{ translateX }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={handleCardPress}
            onLongPress={handleCardLongPress}
            delayLongPress={320}
            style={[
              styles.contentRow,
              {
                paddingVertical: responsive.cardPadding,
                paddingHorizontal: responsive.cardPadding,
              },
            ]}
          >
            {/* Left Info Column */}
            <View style={[styles.infoColPressable, { paddingRight: responsive.s(12) }]}>
              {/* Top row: Schedule • Label • Category Tag */}
              <View style={styles.topInfoRow}>
                <Text
                  style={[
                    styles.scheduleText,
                    {
                      fontSize: responsive.ms(13),
                      color: isEffectivelyEnabled ? colors.textPrimary : colors.textMuted,
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
                        { fontSize: responsive.ms(13), color: colors.textMuted },
                      ]}
                    >
                      •
                    </Text>
                    <Text
                      style={[
                        styles.labelText,
                        {
                          fontSize: responsive.ms(13),
                          color: isEffectivelyEnabled
                            ? colors.textSecondary
                            : colors.textMuted,
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
                        borderRadius: radii.chip,
                        paddingHorizontal: responsive.s(7),
                        paddingVertical: responsive.s(2),
                      },
                    ]}
                  >
                    <Tag size={Math.round(responsive.ms(10))} color={colors.accent} />
                    <Text
                      style={[
                        styles.categoryPillText,
                        {
                          fontSize: responsive.ms(10.5),
                          color: colors.accent,
                          fontFamily: typography.sansBold,
                        },
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
                    fontSize: responsive.ms(22),
                    lineHeight: responsive.ms(27),
                    color: isEffectivelyEnabled ? colors.textPrimary : colors.textMuted,
                    fontFamily: typography.numbersBold,
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {timeDisplay.split(/(AM|PM|এএম|পিএম)/g).map((part, idx) =>
                  part === 'AM' || part === 'PM' || part === 'এএম' || part === 'পিএম' ? (
                    <Text
                      key={idx}
                      style={{
                        fontSize: responsive.ms(13.5),
                        color: isEffectivelyEnabled
                          ? colors.textSecondary
                          : colors.textMuted,
                        fontFamily: typography.sansMedium,
                      }}
                    >
                      {part}
                    </Text>
                  ) : (
                    part
                  )
                )}
              </Text>

              {renderModeSubtitle()}

              {/* Paused / Dismissed for Today Status Badge (Style B) */}
              {pauseStatusBadgeText ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    safeHaptics.selectionAsync();
                    handleToggle();
                  }}
                  style={[
                    styles.skipBadge,
                    {
                      backgroundColor: 'rgba(245, 158, 11, 0.14)',
                      borderColor: 'rgba(245, 158, 11, 0.40)',
                      borderRadius: radii.chip,
                      paddingHorizontal: responsive.s(8),
                      paddingVertical: responsive.s(3.5),
                      marginTop: responsive.s(6),
                    },
                  ]}
                >
                  <Power size={Math.round(responsive.ms(11))} color="#F59E0B" />
                  <Text
                    style={[
                      styles.skipBadgeText,
                      {
                        fontSize: responsive.ms(11),
                        color: '#F59E0B',
                        fontFamily: typography.sansBold,
                      },
                    ]}
                  >
                    {pauseStatusBadgeText}
                  </Text>
                </TouchableOpacity>
              ) : null}

              {/* Skip Next Occurrence Visible Indicator */}
              {alarm.isEnabled && alarm.skipNextDate ? (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    safeHaptics.selectionAsync();
                    onToggleSkipNext?.(alarm.id);
                  }}
                  style={[
                    styles.skipBadge,
                    {
                      backgroundColor: 'rgba(245, 158, 11, 0.14)',
                      borderColor: 'rgba(245, 158, 11, 0.40)',
                      borderRadius: radii.chip,
                      paddingHorizontal: responsive.s(8),
                      paddingVertical: responsive.s(3.5),
                      marginTop: responsive.s(6),
                    },
                  ]}
                >
                  <CalendarOff size={Math.round(responsive.ms(11))} color="#F59E0B" />
                  <Text
                    style={[
                      styles.skipBadgeText,
                      {
                        fontSize: responsive.ms(11),
                        color: '#F59E0B',
                        fontFamily: typography.sansBold,
                      },
                    ]}
                  >
                    {t.skippingNextPrefix} {formatSkippedDateLabel(alarm.skipNextDate)}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Right Sibling: Squircle Toggle Button */}
            <View style={styles.toggleWrapper}>
              <SquircleToggleButton
                isEnabled={isEffectivelyEnabled}
                onToggle={handleToggle}
              />
            </View>
          </TouchableOpacity>
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
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: colors.overlayBackdrop,
                  opacity: quickMenuBackdropOpacity,
                },
              ]}
            />
            <Pressable
              style={styles.backdropDismissArea}
              onPress={() => setShowQuickMenu(false)}
            />
            <Animated.View
              onLayout={onSheetLayout}
              {...sheetPanHandlers}
              style={[
                styles.quickSheet,
                shadows.modal,
                {
                  maxWidth: responsive.modalMaxWidth,
                  alignSelf: 'center',
                  paddingHorizontal: responsive.s(20),
                  paddingTop: responsive.s(12),
                  paddingBottom: responsive.modalBottomPadding + 8,
                  gap: responsive.s(9),
                  backgroundColor: colors.modalSurface,
                  borderColor: colors.surfaceBorder,
                  borderTopLeftRadius: radii.modalOuter,
                  borderTopRightRadius: radii.modalOuter,
                  transform: [{ translateY: quickMenuTranslateY }],
                },
              ]}
            >
              <View {...dragHandlePanHandlers} style={styles.quickHeaderDragZone}>
                <View
                  style={[
                    styles.dragHandleBar,
                    {
                      backgroundColor: colors.surfaceBorder,
                      borderRadius: radii.handle,
                    },
                  ]}
                />
                <View style={styles.quickHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.quickTitle,
                        {
                          fontSize: responsive.ms(20),
                          color: colors.textPrimary,
                          fontFamily: typography.numbersBold,
                        },
                      ]}
                    >
                      {timeDisplay}
                    </Text>
                    <Text
                      style={[
                        styles.quickSubtitle,
                        {
                          fontSize: responsive.ms(13),
                          color: colors.textSecondary,
                          fontFamily: typography.sansRegular,
                        },
                      ]}
                    >
                      {trimmedLabel || scheduleStr}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Skip / Resume Next Occurrence */}
              {onToggleSkipNext && alarm.isEnabled && (
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
                      paddingVertical: responsive.s(12),
                      paddingHorizontal: responsive.s(14),
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.button,
                    },
                  ]}
                >
                  {alarm.skipNextDate ? (
                    <CalendarCheck size={Math.round(responsive.ms(18))} color={colors.accent} />
                  ) : (
                    <CalendarOff size={Math.round(responsive.ms(18))} color="#F59E0B" />
                  )}
                  <Text
                    style={[
                      styles.quickOptionText,
                      {
                        fontSize: responsive.ms(14),
                        color: colors.textPrimary,
                        fontFamily: typography.sansMedium,
                      },
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
                      paddingVertical: responsive.s(12),
                      paddingHorizontal: responsive.s(14),
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radii.button,
                    },
                  ]}
                >
                  <Copy size={Math.round(responsive.ms(18))} color={colors.accent} />
                  <Text
                    style={[
                      styles.quickOptionText,
                      {
                        fontSize: responsive.ms(14),
                        color: colors.textPrimary,
                        fontFamily: typography.sansMedium,
                      },
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
                    paddingVertical: responsive.s(12),
                    paddingHorizontal: responsive.s(14),
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radii.button,
                  },
                ]}
              >
                <Edit3 size={Math.round(responsive.ms(18))} color={colors.textPrimary} />
                <Text
                  style={[
                    styles.quickOptionText,
                    {
                      fontSize: responsive.ms(14),
                      color: colors.textPrimary,
                      fontFamily: typography.sansMedium,
                    },
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
                      paddingVertical: responsive.s(12),
                      paddingHorizontal: responsive.s(14),
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      borderColor: 'rgba(239, 68, 68, 0.30)',
                      borderRadius: radii.button,
                    },
                  ]}
                >
                  <Trash2 size={Math.round(responsive.ms(18))} color={colors.danger} />
                  <Text
                    style={[
                      styles.quickOptionText,
                      {
                        fontSize: responsive.ms(14),
                        color: colors.danger,
                        fontFamily: typography.sansBold,
                      },
                    ]}
                  >
                    {t.swipeDeleteBtn}
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>
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
  swipeActionBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  swipeActionSide: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  swipeActionLeft: {
    justifyContent: 'flex-start',
    paddingRight: 28,
  },
  swipeActionRight: {
    justifyContent: 'flex-end',
    paddingLeft: 28,
    marginLeft: 'auto',
  },
  swipeActionLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
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
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  quickSheet: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    gap: 10,
  },
  quickHeaderDragZone: {
    width: '100%',
  },
  dragHandleBar: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    marginBottom: 14,
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
