import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, BellRing } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../core/theme';
import { useAlarmStore } from './store/alarmStore';
import { AlarmItem } from './types';
import { findNextUpcomingAlarm } from './engine/intervalEngine';
import { GreetingHeader } from './components/GreetingHeader';
import { HeroAlarmCard } from './components/HeroAlarmCard';
import { AlarmCardItem } from './components/AlarmCardItem';
import { AlarmEditorModal } from './components/AlarmEditorModal';
import { AlarmRingingOverlay } from './components/AlarmRingingOverlay';

export const IntervalAlarmScreen: React.FC = () => {
  const { colors, typography, radii, shadows, spacing, mode } = useTheme();
  const {
    alarms,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    toggleAlarm,
    setActiveRinging,
  } = useAlarmStore();

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<AlarmItem | null>(null);
  const [countdownText, setCountdownText] = useState<string>('No upcoming alarms');

  // Find next upcoming alarm for the Hero card
  const upcomingInfo = findNextUpcomingAlarm(alarms);

  // Dynamic countdown timer (updates every minute)
  useEffect(() => {
    const updateCountdown = () => {
      const info = findNextUpcomingAlarm(alarms);
      if (info) {
        setCountdownText(info.countdownText);
      } else {
        setCountdownText('All alarms are paused');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [alarms]);

  const handleOpenAddModal = () => {
    Haptics.selectionAsync();
    setEditingAlarm(null);
    setEditorVisible(true);
  };

  const handleOpenEditModal = (alarm: AlarmItem) => {
    Haptics.selectionAsync();
    setEditingAlarm(alarm);
    setEditorVisible(true);
  };

  const handleSaveAlarm = async (alarmData: Omit<AlarmItem, 'id'>) => {
    if (editingAlarm) {
      await updateAlarm(editingAlarm.id, alarmData);
    } else {
      await addAlarm(alarmData);
    }
  };

  // Demo simulator trigger for instant verification of ringing experience
  const handleTestRing = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const target = upcomingInfo?.nextAlarm || alarms[0];
    if (target) {
      setActiveRinging({
        alarm: target,
        currentStepIndex: 2,
        totalSteps: 7,
        currentTimeString: '06:50 AM',
      });
    }
  };

  return (
    <View style={styles.rootContainer}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {/* Subtle non-distracting atmospheric canvas gradient */}
      <LinearGradient
        colors={[colors.canvasGradientStart, colors.canvasGradientEnd]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Love Note Greeting & Theme Toggle */}
        <GreetingHeader />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* Top Hero Alarm Card */}
          {upcomingInfo?.nextAlarm ? (
            <HeroAlarmCard
              alarm={upcomingInfo.nextAlarm}
              countdownText={countdownText}
              onPressCard={() => handleOpenEditModal(upcomingInfo.nextAlarm)}
              onToggle={() => toggleAlarm(upcomingInfo.nextAlarm.id)}
            />
          ) : (
            <View
              style={[
                styles.emptyHeroCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.cardOuter,
                  marginHorizontal: spacing.lg,
                  marginVertical: spacing.sm,
                  padding: spacing.xl,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyHeroTitle,
                  { color: colors.textPrimary, fontFamily: typography.numbersBold },
                ]}
              >
                No Active Alarms
              </Text>
              <Text
                style={[
                  styles.emptyHeroSub,
                  { color: colors.textMuted, fontFamily: typography.numbersRegular },
                ]}
              >
                Tap the (+) button below to schedule your morning interval alarms or single wake-up.
              </Text>
            </View>
          )}

          {/* Section Header */}
          <View
            style={[
              styles.sectionHeaderRow,
              { paddingHorizontal: spacing.lg, marginTop: spacing.md },
            ]}
          >
            <Text
              style={[
                styles.sectionHeaderTitle,
                { color: colors.textSecondary, fontFamily: typography.numbersBold },
              ]}
            >
              ALL ALARMS ({alarms.length})
            </Text>

            {/* Quick Test Alarm Ring Preview Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleTestRing}
              style={[
                styles.testRingPill,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.surfaceBorder,
                  borderRadius: radii.pill,
                },
              ]}
            >
              <BellRing size={12} color={colors.primary} strokeWidth={2.2} />
              <Text
                style={[
                  styles.testRingText,
                  { color: colors.primary, fontFamily: typography.numbersBold },
                ]}
              >
                Preview Ring
              </Text>
            </TouchableOpacity>
          </View>

          {/* List of Saved Alarms */}
          {alarms.map((alarm) => (
            <AlarmCardItem
              key={alarm.id}
              alarm={alarm}
              onPressCard={() => handleOpenEditModal(alarm)}
              onToggle={() => toggleAlarm(alarm.id)}
              onDelete={() => deleteAlarm(alarm.id)}
            />
          ))}
        </ScrollView>

        {/* Floating Action Button (+) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleOpenAddModal}
          style={[
            styles.fab,
            shadows.buttonPrimary,
            {
              backgroundColor: colors.primary,
              borderRadius: radii.squircleToggle,
            },
          ]}
          accessibilityLabel="Add new alarm"
        >
          <Plus size={28} color={colors.textOnPrimary} strokeWidth={2.6} />
        </TouchableOpacity>

        {/* Alarm Creation / Edit Modal */}
        <AlarmEditorModal
          visible={editorVisible}
          initialAlarm={editingAlarm}
          onClose={() => setEditorVisible(false)}
          onSave={handleSaveAlarm}
        />

        {/* Active Ringing Overlay with Dismiss All Remaining */}
        <AlarmRingingOverlay />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  emptyHeroCard: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHeroTitle: {
    fontSize: 20,
    marginBottom: 6,
  },
  emptyHeroSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    letterSpacing: 0.6,
  },
  testRingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  testRingText: {
    fontSize: 11,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
