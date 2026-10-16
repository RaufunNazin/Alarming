import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/core/theme';
import { getActiveModule } from './src/modules/registry';
import { useAlarmStore } from './src/modules/interval-alarm/store/alarmStore';
import {
  initializeAlarmNotifications,
  ACTION_DISMISS_ALL,
  ACTION_DISMISS_SINGLE,
} from './src/core/notifications/alarmNotifier';

const WEB_INITIAL_METRICS = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: {
    x: 0,
    y: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 480,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  },
};

const ActiveScreen = getActiveModule();

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

  const initialize = useAlarmStore((s) => s.initialize);
  const dismissAllRemainingForToday = useAlarmStore((s) => s.dismissAllRemainingForToday);
  const dismissSingleAlarm = useAlarmStore((s) => s.dismissSingleAlarm);
  const setActiveRinging = useAlarmStore((s) => s.setActiveRinging);
  const checkAlarmTriggerTick = useAlarmStore((s) => s.checkAlarmTriggerTick);

  useEffect(() => {
    // Inject Google Web Fonts for instant zero-block rendering on Web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const fontId = 'alarming-google-fonts';
      if (!document.getElementById(fontId)) {
        const link = document.createElement('link');
        link.id = fontId;
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Outfit:wght@300;400;500;600;700&display=swap';
        document.head.appendChild(link);
      }
    }

    initialize();
    initializeAlarmNotifications();

    // Active in-app alarm ticker running every 5 seconds for foreground/web reliability
    const tickInterval = setInterval(() => {
      checkAlarmTriggerTick();
    }, 5000);

    // Listen to notification responses (including lock screen actions)
    let subscription: Notifications.EventSubscription | null = null;
    let foregroundSubscription: Notifications.EventSubscription | null = null;

    if (Platform.OS !== 'web') {
      subscription = Notifications.addNotificationResponseReceivedListener(
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
            const currentAlarms = useAlarmStore.getState().alarms;
            const target = currentAlarms.find((a) => a.id === alarmId);
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
      foregroundSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
          const data = notification.request.content.data;
          const alarmId = data?.alarmId as string;
          if (alarmId) {
            const currentAlarms = useAlarmStore.getState().alarms;
            const target = currentAlarms.find((a) => a.id === alarmId);
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
    }

    return () => {
      clearInterval(tickInterval);
      subscription?.remove();
      foregroundSubscription?.remove();
    };
  }, []);

  // On native, wait for fonts; on web, render immediately with CSS fallback fonts
  if (!fontsLoaded && Platform.OS !== 'web') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#AD343E" />
      </View>
    );
  }

  return (
    <SafeAreaProvider
      initialMetrics={Platform.OS === 'web' ? WEB_INITIAL_METRICS : undefined}
      style={styles.safeAreaProvider}
    >
      <ThemeProvider>
        <View style={styles.webOuter}>
          <View style={styles.webContainer}>
            <ActiveScreen />
          </View>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeAreaProvider: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webOuter: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0A090B',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  webContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111012',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
