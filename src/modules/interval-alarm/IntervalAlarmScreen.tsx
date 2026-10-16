import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import { useAlarmStore } from './store/alarmStore';
import { AlarmItem } from './types';
import { GreetingHeader } from './components/GreetingHeader';
import { AlarmCardItem } from './components/AlarmCardItem';
import { AlarmCreationModal } from './components/AlarmCreationModal';
import { AlarmEditModal } from './components/AlarmEditModal';
import { AlarmRingingOverlay } from './components/AlarmRingingOverlay';
import { AlarmToastBanner } from './components/AlarmToastBanner';

export const IntervalAlarmScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, typography, radii, shadows } = useTheme();
  const {
    alarms,
    addAlarm,
    updateAlarm,
    deleteAlarm,
    toggleAlarm,
  } = useAlarmStore();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<AlarmItem | null>(null);

  const handleOpenAddModal = () => {
    setCreateModalVisible(true);
  };

  const handleOpenEditModal = (alarm: AlarmItem) => {
    setEditingAlarm(alarm);
  };

  // Status bar inset calculation for Android & iOS
  const topInset = Math.max(insets.top, RNStatusBar.currentHeight ?? 0, 20);
  const bottomInset = Math.max(insets.bottom, 16);

  return (
    <View style={styles.rootContainer}>
      <StatusBar style="light" />

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
        {/* Native Alarms Header */}
        <GreetingHeader />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}
        >
          {/* List of Alarms or Clean Empty State */}
          {alarms.length > 0 ? (
            alarms.map((alarm) => (
              <AlarmCardItem
                key={alarm.id}
                alarm={alarm}
                onPressCard={() => handleOpenEditModal(alarm)}
                onToggle={() => toggleAlarm(alarm.id)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    borderRadius: radii.cardOuter,
                  },
                ]}
              >
                <Bell size={36} color={colors.textMuted} strokeWidth={1.8} />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.textPrimary, fontFamily: typography.numbersBold },
                ]}
              >
                No Alarms
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  { color: colors.textSecondary, fontFamily: typography.numbersRegular },
                ]}
              >
                Tap + below to set your first alarm.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Floating Action Button (+) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleOpenAddModal}
          style={[
            styles.fab,
            shadows.buttonPrimary,
            {
              backgroundColor: colors.textPrimary,
              borderRadius: radii.squircleToggle,
              right: 16,
              bottom: bottomInset + 16,
            },
          ]}
          accessibilityLabel="Add new alarm"
        >
          <Plus size={28} color={colors.textOnPrimary} strokeWidth={2.6} />
        </TouchableOpacity>

        {/* Alarm Creation Modal */}
        <AlarmCreationModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSave={addAlarm}
        />

        {/* Alarm Edit Modal */}
        {editingAlarm && (
          <AlarmEditModal
            visible={Boolean(editingAlarm)}
            alarm={editingAlarm}
            onClose={() => setEditingAlarm(null)}
            onSave={(updatedData) => {
              if (editingAlarm) {
                updateAlarm(editingAlarm.id, updatedData);
              }
            }}
            onDelete={deleteAlarm}
          />
        )}

        {/* Active Ringing Overlay with Dismiss All Remaining */}
        <AlarmRingingOverlay />

        {/* Alarm Set Duration Toast: end-to-end matching side margins of alarm list */}
        <AlarmToastBanner
          bottomOffset={bottomInset + 16 + 60 + 16}
          horizontalMargin={16}
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
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
  fab: {
    position: 'absolute',
    right: 16,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
