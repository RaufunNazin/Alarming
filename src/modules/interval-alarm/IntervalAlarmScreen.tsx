import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  AppState,
  Pressable,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Updates from 'expo-updates';
import { Plus, Bell, Zap, Sun, Tag, Power, Check } from 'lucide-react-native';
import { useTheme } from '../../core/theme';
import { useSettingsStore } from '../../core/settings/settingsStore';
import {
  useTranslation,
  formatUpdateTimestampLocalized,
} from '../../core/i18n/translations';
import { useAlarmStore } from './store/alarmStore';
import { AlarmItem } from './types';
import {
  calculateNextOccurrence,
  CategoryPauseMode,
  formatAlarmTimeDisplay,
  getCategorySmartPauseInfo,
  isCurrentActiveCycleDismissed,
} from './engine/intervalEngine';
import { GreetingHeader } from './components/GreetingHeader';
import { AlarmCardItem } from './components/AlarmCardItem';
import { AlarmCreationModal } from './components/AlarmCreationModal';
import { AlarmEditModal } from './components/AlarmEditModal';
import { AlarmRingingOverlay } from './components/AlarmRingingOverlay';
import { AlarmToastBanner } from './components/AlarmToastBanner';
import { SettingsModal } from './components/SettingsModal';
import { PowerNapPresetModal } from './components/PowerNapPresetModal';
import { useSheetModalGesture } from './components/useSheetModalGesture';
import { safeHaptics } from '../../core/haptics/safeHaptics';

export const IntervalAlarmScreen: React.FC = () => {
  const { colors, typography, radii, shadows, themeMode, responsive } = useTheme();
  const { t, language, formatNum } = useTranslation();
  const showPowerNapButton = useSettingsStore((s) => s.showPowerNapButton);
  const defaultPowerNapMinutes = useSettingsStore((s) => s.defaultPowerNapMinutes);
  const earlyDismissalWindowMinutes = useSettingsStore(
    (s) => s.earlyDismissalWindowMinutes
  );
  const configuredCategories = useSettingsStore((s) => s.categories);

  const alarms = useAlarmStore((s) => s.alarms);
  const activePowerNap = useAlarmStore((s) => s.activePowerNap);
  const addAlarm = useAlarmStore((s) => s.addAlarm);
  const startPowerNap = useAlarmStore((s) => s.startPowerNap);
  const cancelPowerNap = useAlarmStore((s) => s.cancelPowerNap);
  const updateAlarm = useAlarmStore((s) => s.updateAlarm);
  const softDeleteAlarm = useAlarmStore((s) => s.softDeleteAlarm);
  const duplicateAlarm = useAlarmStore((s) => s.duplicateAlarm);
  const toggleSkipNextOccurrence = useAlarmStore((s) => s.toggleSkipNextOccurrence);
  const dismissUpcomingToday = useAlarmStore((s) => s.dismissUpcomingToday);
  const toggleCategoryAlarms = useAlarmStore((s) => s.toggleCategoryAlarms);
  const toggleAlarm = useAlarmStore((s) => s.toggleAlarm);
  const whatsNewModalVisible = useAlarmStore((s) => s.whatsNewModalVisible);
  const setWhatsNewModalVisible = useAlarmStore((s) => s.setWhatsNewModalVisible);
  const lastUpdatedAt = useAlarmStore((s) => s.lastUpdatedAt);

  const currentVersion = Updates.runtimeVersion || '1.0.0';
  const formattedUpdatedAt = formatUpdateTimestampLocalized(
    (Updates.createdAt ? Updates.createdAt.getTime() : null) ||
      lastUpdatedAt ||
      Date.now(),
    language
  );

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<AlarmItem | null>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [powerNapModalVisible, setPowerNapModalVisible] = useState(false);
  const [cancelPowerNapModalVisible, setCancelPowerNapModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [groupToggleConfirm, setGroupToggleConfirm] = useState<{
    category: string;
    enable: boolean;
    pauseMode: CategoryPauseMode;
  } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [powerNapRemainingSec, setPowerNapRemainingSec] = useState<number>(0);

  const groupToggleGesture = useSheetModalGesture(
    Boolean(groupToggleConfirm),
    () => setGroupToggleConfirm(null)
  );
  const cancelPowerNapGesture = useSheetModalGesture(
    cancelPowerNapModalVisible,
    () => setCancelPowerNapModalVisible(false)
  );
  const whatsNewGesture = useSheetModalGesture(whatsNewModalVisible, () =>
    setWhatsNewModalVisible(false)
  );

  useEffect(() => {
    const syncClockIfMinuteChanged = () => {
      const next = new Date();
      setNow((prev) =>
        Math.floor(prev.getTime() / 60000) === Math.floor(next.getTime() / 60000)
          ? prev
          : next
      );
    };

    const timer = setInterval(syncClockIfMinuteChanged, 2000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncClockIfMinuteChanged();
      }
    });

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  // Live 1-second countdown ticker while a Power Nap is active
  useEffect(() => {
    if (!activePowerNap) {
      setPowerNapRemainingSec(0);
      return;
    }

    const updateRemaining = () => {
      const diffSec = Math.max(0, Math.ceil((activePowerNap.endsAt - Date.now()) / 1000));
      setPowerNapRemainingSec(diffSec);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [activePowerNap]);

  const formattedPowerNapCountdown = useMemo(() => {
    const totalSec = Math.max(0, powerNapRemainingSec);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const zeroChar = formatNum(0);
    const mm = formatNum(mins).padStart(2, zeroChar);
    const ss = formatNum(secs).padStart(2, zeroChar);
    if (hrs > 0) {
      return `${formatNum(hrs)}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
  }, [powerNapRemainingSec, formatNum]);

  const isPowerNapActive = Boolean(activePowerNap && powerNapRemainingSec > 0);

  // Keep editingAlarm synced with store changes (e.g. if skipNextDate is toggled inside modal)
  const currentEditingAlarm = useMemo(() => {
    if (!editingAlarm) return null;
    return alarms.find((a) => a.id === editingAlarm.id) ?? editingAlarm;
  }, [alarms, editingAlarm]);

  // All categories available (configured + any assigned on alarms)
  const allCategories = useMemo(() => {
    const set = new Set<string>(configuredCategories);
    for (const a of alarms) {
      if (a.category) set.add(a.category);
    }
    return Array.from(set);
  }, [configuredCategories, alarms]);

  // Reset selectedCategory if it was deleted in Settings
  useEffect(() => {
    if (selectedCategory && !allCategories.includes(selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [selectedCategory, allCategories]);

  // Filtered alarms by category
  const filteredAlarms = useMemo(() => {
    if (!selectedCategory) return alarms;
    return alarms.filter((a) => a.category === selectedCategory);
  }, [alarms, selectedCategory]);

  const nowMinuteKey = Math.floor(now.getTime() / 60000);

  // Early Dismissal ("I'm Already Awake") candidate: nearest enabled alarm in the active view ringing within earlyDismissalWindowMinutes
  const earlyDismissCandidate = useMemo(() => {
    const windowMs = (earlyDismissalWindowMinutes || 15) * 60 * 1000;
    let best: { alarm: AlarmItem; minsLeft: number } | null = null;

    for (const alarm of filteredAlarms) {
      if (!alarm.isEnabled) continue;
      if (alarm.pausedUntil && alarm.pausedUntil > now.getTime()) continue;
      const nextDate = calculateNextOccurrence(alarm, now);
      const diffMs = nextDate.getTime() - now.getTime();
      if (diffMs > 0 && diffMs <= windowMs) {
        const minsLeft = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
        if (!best || minsLeft < best.minsLeft) {
          best = { alarm, minsLeft };
        }
      }
    }
    return best;
  }, [filteredAlarms, now, earlyDismissalWindowMinutes]);

  const handleOpenAddModal = useCallback(() => {
    safeHaptics.selectionAsync();
    setCreateModalVisible(true);
  }, []);

  const handleOpenEditModal = useCallback((alarm: AlarmItem) => {
    setEditingAlarm(alarm);
  }, []);

  const handleToggleAlarm = useCallback(
    (id: string) => {
      void toggleAlarm(id);
    },
    [toggleAlarm]
  );

  const handleSwipeDelete = useCallback(
    (id: string) => {
      void softDeleteAlarm(id);
    },
    [softDeleteAlarm]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      void duplicateAlarm(id);
    },
    [duplicateAlarm]
  );

  const handleToggleSkipNext = useCallback(
    (id: string) => {
      void toggleSkipNextOccurrence(id);
    },
    [toggleSkipNextOccurrence]
  );

  const handleOpenSettings = useCallback(() => {
    setSettingsModalVisible(true);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalVisible(false);
  }, []);

  const handleCloseSettingsModal = useCallback(() => {
    setSettingsModalVisible(false);
  }, []);

  const handleClosePowerNapModal = useCallback(() => {
    setPowerNapModalVisible(false);
  }, []);

  // Check if selected category has any active (enabled and not paused/dismissed) alarms
  const selectedCategoryAlarms = useMemo(() => {
    if (!selectedCategory) return [];
    return alarms.filter((a) => a.category === selectedCategory);
  }, [alarms, selectedCategory]);

  const anyEnabledInSelectedCategory = selectedCategoryAlarms.some(
    (a) =>
      a.isEnabled &&
      !(a.pausedUntil && a.pausedUntil > now.getTime()) &&
      !isCurrentActiveCycleDismissed(a, now)
  );

  const selectedCategorySmartPause = useMemo(() => {
    if (!selectedCategory) return null;
    return getCategorySmartPauseInfo(alarms, selectedCategory, now);
  }, [alarms, selectedCategory, now]);

  // Status bar & navigation bar inset calculation for Android (3-button & gesture) & iOS
  const topInset = responsive.topInset;
  const bottomInset = responsive.bottomNavInset;
  const fabSize = responsive.fabSize;
  const fabRadius = Math.round(fabSize * 0.225);

  return (
    <View style={styles.rootContainer}>
      <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />

      {/* Subtle atmospheric canvas gradient */}
      <LinearGradient
        colors={[colors.canvasGradientStart, colors.canvasGradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.safeAreaContainer,
          {
            paddingTop: topInset,
            paddingBottom: bottomInset,
          },
        ]}
      >
        {/* Native Alarms Header with Safety Status & Settings Icons */}
        <GreetingHeader onOpenSettings={handleOpenSettings} />

        {/* Category Filter Slider + Under-Slider Category Toggle */}
        {alarms.length > 0 && allCategories.length > 0 && (
          <View style={styles.categoryBarWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.categoryScrollContent,
                { paddingHorizontal: responsive.screenPadding },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  safeHaptics.selectionAsync();
                  setSelectedCategory(null);
                }}
                style={[
                  styles.categoryChip,
                  {
                    paddingHorizontal: responsive.s(12),
                    paddingVertical: responsive.s(5.5),
                    backgroundColor:
                      selectedCategory === null
                        ? colors.accent
                        : themeMode === 'light'
                          ? colors.cardOnBg
                          : colors.surfaceSubtle,
                    borderColor:
                      selectedCategory === null ? colors.accent : colors.surfaceBorder,
                    borderRadius: radii.chip,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      fontSize: responsive.ms(12),
                      color:
                        selectedCategory === null ? '#FFFFFF' : colors.textSecondary,
                      fontFamily:
                        selectedCategory === null
                          ? typography.sansBold
                          : typography.sansMedium,
                    },
                  ]}
                >
                  {t.categoryAll}
                </Text>
              </TouchableOpacity>

              {allCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const count = alarms.filter((a) => a.category === cat).length;
                return (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.8}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      setSelectedCategory(isSelected ? null : cat);
                    }}
                    style={[
                      styles.categoryChip,
                      {
                        paddingHorizontal: responsive.s(12),
                        paddingVertical: responsive.s(5.5),
                        backgroundColor: isSelected
                          ? colors.accent
                          : themeMode === 'light'
                            ? colors.cardOnBg
                            : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.accent : colors.surfaceBorder,
                        borderRadius: radii.chip,
                      },
                    ]}
                  >
                    <Tag
                      size={Math.round(responsive.ms(11))}
                      color={isSelected ? '#FFFFFF' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          fontSize: responsive.ms(12),
                          color: isSelected ? '#FFFFFF' : colors.textSecondary,
                          fontFamily: isSelected
                            ? typography.sansBold
                            : typography.sansMedium,
                        },
                      ]}
                    >
                      {cat}
                      {count > 0 ? ` (${count})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Full-width category action bar aligned with alarm cards */}
            {selectedCategory && selectedCategoryAlarms.length > 0 && (
              <View
                style={[
                  styles.underCategoryRow,
                  { paddingHorizontal: responsive.screenPadding },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => {
                    safeHaptics.impactAsync(safeHaptics.ImpactFeedbackStyle.Light);
                    const defaultPauseMode: CategoryPauseMode =
                      selectedCategorySmartPause?.recommendedMode ?? 'rest_of_today';
                    setGroupToggleConfirm({
                      category: selectedCategory,
                      enable: !anyEnabledInSelectedCategory,
                      pauseMode: defaultPauseMode,
                    });
                  }}
                  style={[
                    styles.groupToggleBar,
                    {
                      paddingHorizontal: responsive.s(13),
                      paddingVertical: responsive.s(10),
                      backgroundColor: anyEnabledInSelectedCategory
                        ? 'rgba(245, 158, 11, 0.12)'
                        : colors.accentSoft,
                      borderColor: anyEnabledInSelectedCategory
                        ? 'rgba(245, 158, 11, 0.38)'
                        : colors.accent + '55',
                      borderRadius: radii.cardInner,
                    },
                  ]}
                >
                  <View style={styles.groupToggleBarLeft}>
                    <View
                      style={[
                        styles.groupToggleIconBox,
                        {
                          width: responsive.s(25),
                          height: responsive.s(25),
                          backgroundColor: anyEnabledInSelectedCategory
                            ? 'rgba(245, 158, 11, 0.20)'
                            : colors.accent + '25',
                          borderRadius: radii.chip,
                        },
                      ]}
                    >
                      <Power
                        size={Math.round(responsive.ms(13))}
                        color={anyEnabledInSelectedCategory ? '#F59E0B' : colors.accent}
                      />
                    </View>
                    <Text
                      style={[
                        styles.groupToggleBarTitle,
                        {
                          fontSize: responsive.ms(13),
                          color: anyEnabledInSelectedCategory ? '#F59E0B' : colors.accent,
                          fontFamily: typography.sansBold,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {anyEnabledInSelectedCategory
                        ? selectedCategorySmartPause?.recommendedMode === 'tomorrow'
                          ? t.groupToggleActionOffTomorrow(selectedCategory)
                          : t.groupToggleActionOffToday(selectedCategory)
                        : t.groupToggleActionOn(selectedCategory)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.groupToggleRightBadge,
                      {
                        paddingHorizontal: responsive.s(8),
                        paddingVertical: responsive.s(3.5),
                        backgroundColor: anyEnabledInSelectedCategory
                          ? 'rgba(245, 158, 11, 0.18)'
                          : colors.accent + '22',
                        borderRadius: radii.chip,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.groupToggleRightBadgeText,
                        {
                          fontSize: responsive.ms(11),
                          color: anyEnabledInSelectedCategory ? '#F59E0B' : colors.accent,
                          fontFamily: typography.sansBold,
                        },
                      ]}
                    >
                      {anyEnabledInSelectedCategory
                        ? selectedCategorySmartPause?.recommendedMode === 'tomorrow'
                          ? t.groupToggleSubHintTomorrow
                          : t.groupToggleSubHintToday
                        : t.groupToggleSubHintResume}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: bottomInset + fabSize + 36,
            },
            filteredAlarms.length === 0 && styles.emptyScrollContent,
          ]}
        >
          {/* "I'm Already Awake" Pre-Alarm Early Dismissal Card */}
          {earlyDismissCandidate && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                safeHaptics.selectionAsync();
                void dismissUpcomingToday(earlyDismissCandidate.alarm.id);
              }}
              style={[
                styles.earlyDismissCard,
                shadows.card,
                {
                  marginHorizontal: responsive.screenPadding,
                  paddingHorizontal: responsive.s(15),
                  paddingVertical: responsive.s(12),
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accent + '55',
                  borderRadius: radii.cardOuter,
                },
              ]}
            >
              <View
                style={[
                  styles.earlyDismissIconCircle,
                  {
                    width: responsive.s(36),
                    height: responsive.s(36),
                    backgroundColor: colors.accent + '25',
                    borderRadius: radii.chip,
                  },
                ]}
              >
                <Sun size={Math.round(responsive.ms(19))} color={colors.accent} />
              </View>
              <View style={styles.earlyDismissTextCol}>
                <Text
                  style={[
                    styles.earlyDismissTitle,
                    {
                      fontSize: responsive.ms(13.5),
                      lineHeight: responsive.ms(18),
                      color: colors.textPrimary,
                      fontFamily: typography.sansBold,
                    },
                  ]}
                >
                  {t.earlyDismissBannerTitle(
                    earlyDismissCandidate.alarm.label?.trim() ||
                      formatAlarmTimeDisplay(earlyDismissCandidate.alarm) ||
                      (language === 'bn' ? 'অ্যালার্ম' : 'Alarm'),
                    earlyDismissCandidate.minsLeft
                  )}
                </Text>
                <Text
                  style={[
                    styles.earlyDismissSub,
                    {
                      fontSize: responsive.ms(12),
                      color: colors.accent,
                      fontFamily: typography.sansBold,
                    },
                  ]}
                >
                  {t.earlyDismissBannerSub}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* List of Alarms or Clean Empty State */}
          {filteredAlarms.length > 0 ? (
            filteredAlarms.map((alarm) => (
              <AlarmCardItem
                key={alarm.id}
                alarm={alarm}
                nowMinuteKey={nowMinuteKey}
                onPressCard={handleOpenEditModal}
                onToggle={handleToggleAlarm}
                onSwipeDelete={handleSwipeDelete}
                onDuplicate={handleDuplicate}
                onToggleSkipNext={handleToggleSkipNext}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    width: responsive.s(68),
                    height: responsive.s(68),
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radii.cardOuter,
                  },
                ]}
              >
                <Bell
                  size={Math.round(responsive.ms(34))}
                  color={colors.textMuted}
                  strokeWidth={1.8}
                />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    fontSize: responsive.ms(20),
                    color: colors.textPrimary,
                    fontFamily: typography.numbersBold,
                  },
                ]}
              >
                {t.noAlarmsTitle}
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  {
                    fontSize: responsive.ms(14),
                    color: colors.textSecondary,
                    fontFamily: typography.numbersRegular,
                  },
                ]}
              >
                {t.noAlarmsSub}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Floating Action Bar: Power Nap Pill + '+' Add Alarm FAB */}
        <View
          style={[
            styles.floatingBottomRow,
            {
              left: responsive.screenPadding,
              right: responsive.screenPadding,
              bottom: bottomInset + (responsive.isCompact ? 10 : 14),
              gap: responsive.s(10),
            },
          ]}
          pointerEvents="box-none"
        >
          {showPowerNapButton && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                safeHaptics.impactAsync(safeHaptics.ImpactFeedbackStyle.Light);
                if (isPowerNapActive) {
                  setCancelPowerNapModalVisible(true);
                } else {
                  void startPowerNap();
                }
              }}
              onLongPress={() => {
                safeHaptics.impactAsync(safeHaptics.ImpactFeedbackStyle.Medium);
                if (isPowerNapActive) {
                  setCancelPowerNapModalVisible(true);
                } else {
                  setPowerNapModalVisible(true);
                }
              }}
              delayLongPress={320}
              style={[
                styles.powerNapFab,
                shadows.buttonPrimary,
                {
                  height: fabSize,
                  paddingHorizontal: responsive.s(12),
                  gap: responsive.s(8),
                  backgroundColor: isPowerNapActive
                    ? colors.primaryMuted
                    : colors.surfaceHero,
                  borderColor: isPowerNapActive
                    ? colors.primary
                    : colors.primary + '55',
                  borderRadius: fabRadius,
                },
              ]}
              accessibilityLabel={t.powerNapLabel}
            >
              <View
                style={[
                  styles.powerNapIconCircle,
                  {
                    width: Math.round(fabSize * 0.56),
                    height: Math.round(fabSize * 0.56),
                    backgroundColor: isPowerNapActive
                      ? colors.primary
                      : colors.primaryMuted,
                    borderRadius: radii.chip,
                  },
                ]}
              >
                <Zap
                  size={Math.round(responsive.ms(17))}
                  color={isPowerNapActive ? '#FFFFFF' : colors.primary}
                  fill={isPowerNapActive ? '#FFFFFF' : colors.primary}
                />
              </View>
              <View style={styles.powerNapTextCol}>
                <Text
                  style={[
                    styles.powerNapMainText,
                    {
                      fontSize: responsive.ms(14.5),
                      lineHeight: responsive.ms(18),
                      color: isPowerNapActive ? colors.primaryLight : colors.textPrimary,
                      fontFamily: typography.numbersBold,
                    },
                  ]}
                >
                  {isPowerNapActive
                    ? formattedPowerNapCountdown
                    : t.powerNapButtonShort(defaultPowerNapMinutes)}
                </Text>
                <Text
                  style={[
                    styles.powerNapSubText,
                    {
                      fontSize: responsive.ms(10),
                      lineHeight: responsive.ms(12.5),
                      color: colors.textSecondary,
                      fontFamily: typography.sansRegular,
                    },
                  ]}
                >
                  {isPowerNapActive ? t.powerNapTapToCancel : t.powerNapHint}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenAddModal}
            style={[
              styles.fab,
              shadows.buttonPrimary,
              {
                width: fabSize,
                height: fabSize,
                backgroundColor: colors.textPrimary,
                borderRadius: fabRadius,
              },
            ]}
            accessibilityLabel="Add new alarm"
          >
            <Plus
              size={Math.round(fabSize * 0.46)}
              color={colors.textOnPrimary}
              strokeWidth={2.6}
            />
          </TouchableOpacity>
        </View>

        {/* Cancel Power Nap Confirmation Modal */}
        {cancelPowerNapModalVisible && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setCancelPowerNapModalVisible(false)}
          >
            <View style={styles.sheetModalBackdrop}>
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: colors.overlayBackdrop,
                    opacity: cancelPowerNapGesture.backdropOpacity,
                  },
                ]}
              />
              <Pressable
                style={styles.backdropDismissArea}
                onPress={() => setCancelPowerNapModalVisible(false)}
              />
              <Animated.View
                onLayout={cancelPowerNapGesture.onSheetLayout}
                {...cancelPowerNapGesture.sheetPanHandlers}
                style={[
                  styles.confirmSheet,
                  shadows.modal,
                  {
                    maxWidth: responsive.modalMaxWidth,
                    alignSelf: 'center',
                    paddingHorizontal: responsive.s(20),
                    paddingTop: responsive.s(12),
                    paddingBottom: responsive.modalBottomPadding + 8,
                    backgroundColor: colors.modalSurface,
                    borderColor: colors.surfaceBorder,
                    borderTopLeftRadius: radii.modalOuter,
                    borderTopRightRadius: radii.modalOuter,
                    transform: [{ translateY: cancelPowerNapGesture.translateY }],
                  },
                ]}
              >
                <View
                  {...cancelPowerNapGesture.dragHandlePanHandlers}
                  style={[
                    styles.sheetDragHandle,
                    {
                      backgroundColor: colors.surfaceBorder,
                      borderRadius: radii.handle,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.confirmTitle,
                    {
                      fontSize: responsive.ms(18),
                      color: colors.textPrimary,
                      fontFamily: typography.sansBold,
                    },
                  ]}
                >
                  {t.cancelPowerNapTitle}
                </Text>
                <Text
                  style={[
                    styles.confirmBody,
                    {
                      fontSize: responsive.ms(14),
                      lineHeight: responsive.ms(20),
                      color: colors.textSecondary,
                      fontFamily: typography.sansRegular,
                    },
                  ]}
                >
                  {t.cancelPowerNapBody}
                </Text>

                <View style={styles.confirmBtnRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      setCancelPowerNapModalVisible(false);
                    }}
                    style={[
                      styles.confirmBtn,
                      {
                        paddingVertical: responsive.s(13),
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.button,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.confirmBtnText,
                        {
                          fontSize: responsive.ms(14),
                          color: colors.textPrimary,
                          fontFamily: typography.sansMedium,
                        },
                      ]}
                    >
                      {t.keepNapBtn}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      safeHaptics.notificationAsync(
                        safeHaptics.NotificationFeedbackType.Warning
                      );
                      setCancelPowerNapModalVisible(false);
                      void cancelPowerNap();
                    }}
                    style={[
                      styles.confirmBtn,
                      {
                        paddingVertical: responsive.s(13),
                        backgroundColor: colors.danger,
                        borderColor: colors.danger,
                        borderRadius: radii.button,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.confirmBtnText,
                        {
                          fontSize: responsive.ms(14),
                          color: '#FFFFFF',
                          fontFamily: typography.sansBold,
                        },
                      ]}
                    >
                      {t.cancelNapBtn}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </Modal>
        )}

        {/* Bespoke Category Group Toggle Confirmation Modal */}
        {groupToggleConfirm && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setGroupToggleConfirm(null)}
          >
            <View style={styles.sheetModalBackdrop}>
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: colors.overlayBackdrop,
                    opacity: groupToggleGesture.backdropOpacity,
                  },
                ]}
              />
              <Pressable
                style={styles.backdropDismissArea}
                onPress={() => setGroupToggleConfirm(null)}
              />
              <Animated.View
                onLayout={groupToggleGesture.onSheetLayout}
                {...groupToggleGesture.sheetPanHandlers}
                style={[
                  styles.confirmSheet,
                  shadows.modal,
                  {
                    maxWidth: responsive.modalMaxWidth,
                    alignSelf: 'center',
                    paddingHorizontal: responsive.s(20),
                    paddingTop: responsive.s(12),
                    paddingBottom: responsive.modalBottomPadding + 8,
                    backgroundColor: colors.modalSurface,
                    borderColor: colors.surfaceBorder,
                    borderTopLeftRadius: radii.modalOuter,
                    borderTopRightRadius: radii.modalOuter,
                    transform: [{ translateY: groupToggleGesture.translateY }],
                  },
                ]}
              >
                <View
                  {...groupToggleGesture.dragHandlePanHandlers}
                  style={[
                    styles.sheetDragHandle,
                    {
                      backgroundColor: colors.surfaceBorder,
                      borderRadius: radii.handle,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.confirmTitle,
                    {
                      fontSize: responsive.ms(18),
                      color: colors.textPrimary,
                      fontFamily: typography.sansBold,
                    },
                  ]}
                >
                  {t.groupToggleModalTitle(
                    groupToggleConfirm.category,
                    groupToggleConfirm.enable
                  )}
                </Text>
                <Text
                  style={[
                    styles.confirmBody,
                    {
                      fontSize: responsive.ms(14),
                      lineHeight: responsive.ms(20),
                      color: colors.textSecondary,
                      fontFamily: typography.sansRegular,
                    },
                  ]}
                >
                  {t.groupToggleModalBody(
                    groupToggleConfirm.category,
                    alarms.filter(
                      (a) =>
                        a.category === groupToggleConfirm.category &&
                        (groupToggleConfirm.enable ? true : a.isEnabled)
                    ).length,
                    groupToggleConfirm.enable
                  )}
                </Text>

                {!groupToggleConfirm.enable && (
                  <View style={styles.pauseModeOptionsGroup}>
                    {(
                      [
                        {
                          mode: 'rest_of_today' as CategoryPauseMode,
                          title: t.groupPauseModeTodayTitle,
                          desc: t.groupPauseModeTodayDesc,
                        },
                        {
                          mode: 'tomorrow' as CategoryPauseMode,
                          title: t.groupPauseModeTomorrowTitle,
                          desc: t.groupPauseModeTomorrowDesc,
                        },
                      ] as const
                    ).map((opt) => {
                      const isSelected = groupToggleConfirm.pauseMode === opt.mode;
                      return (
                        <TouchableOpacity
                          key={opt.mode}
                          activeOpacity={0.82}
                          onPress={() => {
                            safeHaptics.selectionAsync();
                            setGroupToggleConfirm((prev) =>
                              prev ? { ...prev, pauseMode: opt.mode } : null
                            );
                          }}
                          style={[
                            styles.pauseModeCard,
                            {
                              paddingHorizontal: responsive.s(13),
                              paddingVertical: responsive.s(11),
                              backgroundColor: isSelected
                                ? 'rgba(245, 158, 11, 0.14)'
                                : colors.surfaceSubtle,
                              borderColor: isSelected
                                ? '#F59E0B'
                                : colors.surfaceBorder,
                              borderRadius: radii.cardInner,
                            },
                          ]}
                        >
                          <View style={styles.pauseModeTextCol}>
                            <Text
                              style={[
                                styles.pauseModeTitle,
                                {
                                  fontSize: responsive.ms(13.5),
                                  color: isSelected ? '#F59E0B' : colors.textPrimary,
                                  fontFamily: typography.sansBold,
                                },
                              ]}
                            >
                              {opt.title}
                            </Text>
                            <Text
                              style={[
                                styles.pauseModeDesc,
                                {
                                  fontSize: responsive.ms(12),
                                  lineHeight: responsive.ms(16),
                                  color: colors.textSecondary,
                                  fontFamily: typography.sansRegular,
                                },
                              ]}
                            >
                              {opt.desc}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.pauseModeCheckCircle,
                              {
                                width: responsive.s(21),
                                height: responsive.s(21),
                                backgroundColor: isSelected ? '#F59E0B' : 'transparent',
                                borderColor: isSelected
                                  ? '#F59E0B'
                                  : colors.surfaceBorder,
                                borderRadius: radii.chip,
                              },
                            ]}
                          >
                            {isSelected && (
                              <Check size={Math.round(responsive.ms(13))} color="#FFFFFF" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <View style={styles.confirmBtnRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      safeHaptics.selectionAsync();
                      setGroupToggleConfirm(null);
                    }}
                    style={[
                      styles.confirmBtn,
                      {
                        paddingVertical: responsive.s(13),
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.surfaceBorder,
                        borderRadius: radii.button,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.confirmBtnText,
                        {
                          fontSize: responsive.ms(14),
                          color: colors.textSecondary,
                          fontFamily: typography.sansMedium,
                        },
                      ]}
                    >
                      {t.cancelBtn}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      safeHaptics.notificationAsync(
                        safeHaptics.NotificationFeedbackType.Success
                      );
                      const { category, enable, pauseMode } = groupToggleConfirm;
                      setGroupToggleConfirm(null);
                      void toggleCategoryAlarms(category, enable, pauseMode);
                    }}
                    style={[
                      styles.confirmBtn,
                      {
                        paddingVertical: responsive.s(13),
                        backgroundColor: colors.accent,
                        borderColor: colors.accent,
                        borderRadius: radii.button,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.confirmBtnText,
                        {
                          fontSize: responsive.ms(14),
                          color: '#FFFFFF',
                          fontFamily: typography.sansBold,
                        },
                      ]}
                    >
                      {t.confirmBtn}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </Modal>
        )}

        {/* Alarm Creation Modal */}
        <AlarmCreationModal
          visible={createModalVisible}
          initialCategory={selectedCategory ?? undefined}
          onClose={handleCloseCreateModal}
          onSave={addAlarm}
        />

        {/* Alarm Edit Modal */}
        {currentEditingAlarm && (
          <AlarmEditModal
            visible={Boolean(currentEditingAlarm)}
            alarm={currentEditingAlarm}
            onClose={() => setEditingAlarm(null)}
            onSave={(updatedData) => {
              if (currentEditingAlarm) {
                void updateAlarm(currentEditingAlarm.id, updatedData);
              }
            }}
            onDelete={handleSwipeDelete}
            onDuplicate={handleDuplicate}
            onToggleSkipNext={handleToggleSkipNext}
          />
        )}

        {/* Power Nap Preset Modal (on long-press) */}
        <PowerNapPresetModal
          visible={powerNapModalVisible}
          onClose={handleClosePowerNapModal}
        />

        {/* Full Settings Modal */}
        <SettingsModal
          visible={settingsModalVisible}
          onClose={handleCloseSettingsModal}
        />

        {/* Major Version Update Changelog Modal (Automatically shown on version upgrade) */}
        {whatsNewModalVisible && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setWhatsNewModalVisible(false)}
          >
            <View style={styles.sheetModalBackdrop}>
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: colors.overlayBackdrop,
                    opacity: whatsNewGesture.backdropOpacity,
                  },
                ]}
              />
              <Pressable
                style={styles.backdropDismissArea}
                onPress={() => setWhatsNewModalVisible(false)}
              />
              <Animated.View
                onLayout={whatsNewGesture.onSheetLayout}
                {...whatsNewGesture.sheetPanHandlers}
                style={[
                  styles.confirmSheet,
                  shadows.modal,
                  {
                    maxHeight: '84%',
                    maxWidth: responsive.modalMaxWidth,
                    alignSelf: 'center',
                    paddingHorizontal: responsive.screenPadding,
                    paddingTop: responsive.s(12),
                    paddingBottom: responsive.modalBottomPadding + 8,
                    backgroundColor: colors.modalSurface,
                    borderColor: colors.surfaceBorder,
                    borderTopLeftRadius: radii.modalOuter,
                    borderTopRightRadius: radii.modalOuter,
                    transform: [{ translateY: whatsNewGesture.translateY }],
                  },
                ]}
              >
                <View {...whatsNewGesture.dragHandlePanHandlers}>
                  <View
                    style={[
                      styles.sheetDragHandle,
                      {
                        backgroundColor: colors.surfaceBorder,
                        borderRadius: radii.handle,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.confirmTitle,
                      {
                        fontSize: responsive.ms(18),
                        marginBottom: 4,
                        color: colors.textPrimary,
                        fontFamily: typography.sansBold,
                      },
                    ]}
                  >
                    {t.whatsNewModalTitle(currentVersion)}
                  </Text>
                  <Text
                    style={{
                      fontSize: responsive.ms(12),
                      marginBottom: 6,
                      color: colors.primaryLight,
                      fontFamily: typography.sansMedium,
                    }}
                  >
                    {t.lastUpdatedBadge(formattedUpdatedAt)}
                  </Text>
                  <Text
                    style={[
                      styles.confirmBody,
                      {
                        fontSize: responsive.ms(13),
                        lineHeight: responsive.ms(19),
                        marginBottom: 14,
                        color: colors.textSecondary,
                        fontFamily: typography.sansRegular,
                      },
                    ]}
                  >
                    {t.changelogModalSub}
                  </Text>
                </View>

                <ScrollView
                  style={{ flexGrow: 0, flexShrink: 1 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {t.changelogSectionsV100.map((sec, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.whatsNewSectionCard,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.surfaceBorder,
                          borderRadius: radii.cardInner,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.whatsNewSectionTitle,
                          { color: colors.textPrimary, fontFamily: typography.sansBold },
                        ]}
                      >
                        {sec.title}
                      </Text>
                      {sec.items.map((item, i) => (
                        <View key={i} style={styles.whatsNewBulletRow}>
                          <View
                            style={[
                              styles.whatsNewBulletDot,
                              { backgroundColor: colors.primary },
                            ]}
                          />
                          <Text
                            style={[
                              styles.whatsNewBulletText,
                              {
                                color: colors.textSecondary,
                                fontFamily: typography.sansRegular,
                              },
                            ]}
                          >
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    safeHaptics.selectionAsync();
                    setWhatsNewModalVisible(false);
                  }}
                  style={[
                    styles.confirmBtn,
                    {
                      flex: 0,
                      marginTop: 10,
                      paddingVertical: responsive.s(13),
                      backgroundColor: colors.textPrimary,
                      borderColor: colors.textPrimary,
                      borderRadius: radii.button,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.confirmBtnText,
                      {
                        fontSize: responsive.ms(14),
                        color: colors.textOnPrimary,
                        fontFamily: typography.sansBold,
                      },
                    ]}
                  >
                    {t.done}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>
        )}

        {/* Active Ringing Overlay with Dismiss All Remaining */}
        <AlarmRingingOverlay />

        {/* Alarm Set Duration / Undo Delete Toast Banner */}
        <AlarmToastBanner
          bottomOffset={bottomInset + (responsive.isCompact ? 10 : 14) + fabSize + 14}
          horizontalMargin={responsive.screenPadding}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  safeAreaContainer: {
    flex: 1,
  },
  categoryBarWrapper: {
    marginBottom: 4,
  },
  categoryScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  underCategoryRow: {
    width: '100%',
    marginTop: 8,
    marginBottom: 4,
  },
  groupToggleBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
  },
  groupToggleBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  groupToggleIconBox: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupToggleBarTitle: {
    flex: 1,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  groupToggleRightBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  groupToggleRightBadgeText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  pauseModeOptionsGroup: {
    gap: 10,
    marginBottom: 20,
  },
  pauseModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  pauseModeTextCol: {
    flex: 1,
    gap: 3,
  },
  pauseModeTitle: {
    fontSize: 13.5,
  },
  pauseModeDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  pauseModeCheckCircle: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 110,
    paddingTop: 8,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 44,
  },
  earlyDismissCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  earlyDismissIconCircle: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earlyDismissTextCol: {
    flex: 1,
  },
  earlyDismissTitle: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  earlyDismissSub: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  floatingBottomRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  powerNapFab: {
    height: 60,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  powerNapIconCircle: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerNapTextCol: {
    justifyContent: 'center',
    paddingRight: 2,
  },
  powerNapMainText: {
    fontSize: 15,
    lineHeight: 19,
  },
  powerNapSubText: {
    fontSize: 10,
    lineHeight: 13,
  },
  fab: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  confirmSheet: {
    width: '100%',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  sheetDragHandle: {
    width: 38,
    height: 4,
    alignSelf: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  confirmBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  confirmBtnText: {
    fontSize: 14,
  },
  whatsNewSectionCard: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  whatsNewSectionTitle: {
    fontSize: 13.5,
    marginBottom: 6,
  },
  whatsNewBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  whatsNewBulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
  whatsNewBulletText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
});
