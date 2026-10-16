import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import {
  Caveat_400Regular,
  Caveat_600SemiBold,
  Caveat_700Bold,
} from '@expo-google-fonts/caveat';
import {
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from './src/core/theme';
import { getActiveModule } from './src/modules/registry';
import { useAlarmStore } from './src/modules/interval-alarm/store/alarmStore';
import {
  initializeAlarmNotifications,
  ACTION_DISMISS_ALL,
  ACTION_DISMISS_SINGLE,
} from './src/core/notifications/alarmNotifier';

export default function App() {
  const [fontsLoaded] = useFonts({
    Caveat_400Regular,
    Caveat_600SemiBold,
    Caveat_700Bold,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const {
    initialize,
    dismissAllRemainingForToday,
    dismissSingleAlarm,
    setActiveRinging,
    alarms,
  } = useAlarmStore();

  useEffect(() => {
    initializeAlarmNotifications();
    initialize();

    // Listen to notification responses (including lock screen actions)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const actionIdentifier = response.actionIdentifier;
        const data = response.notification.request.content.data;
        const alarmId = data?.alarmId as string;

        if (actionIdentifier === ACTION_DISMISS_ALL && alarmId) {
          dismissAllRemainingForToday(alarmId);
        } else if (actionIdentifier === ACTION_DISMISS_SINGLE && alarmId) {
          dismissSingleAlarm(alarmId);
        } else if (alarmId) {
          // User tapped notification directly: open ringing overlay
          const target = alarms.find((a) => a.id === alarmId);
          if (target) {
            setActiveRinging({
              alarm: target,
              currentStepIndex: typeof data?.stepIndex === 'number' ? data.stepIndex : 0,
              totalSteps: typeof data?.totalSteps === 'number' ? data.totalSteps : 1,
              currentTimeString: typeof data?.timeString === 'string' ? data.timeString : '06:30 AM',
            });
          }
        }
      }
    );

    // Listen to incoming foreground notifications
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        const alarmId = data?.alarmId as string;
        if (alarmId) {
          const target = alarms.find((a) => a.id === alarmId);
          if (target) {
            setActiveRinging({
              alarm: target,
              currentStepIndex: typeof data?.stepIndex === 'number' ? data.stepIndex : 0,
              totalSteps: typeof data?.totalSteps === 'number' ? data.totalSteps : 1,
              currentTimeString: typeof data?.timeString === 'string' ? data.timeString : '06:30 AM',
            });
          }
        }
      }
    );

    return () => {
      subscription.remove();
      foregroundSubscription.remove();
    };
  }, [alarms]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  const ActiveScreen = getActiveModule();

  return (
    <ThemeProvider>
      <ActiveScreen />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#130E14',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
