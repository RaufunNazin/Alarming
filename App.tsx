import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, AppState } from 'react-native';
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
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/core/theme';
import { useSettingsStore } from './src/core/settings/settingsStore';
import { getActiveModule } from './src/modules/registry';
import { useAlarmStore } from './src/modules/interval-alarm/store/alarmStore';
import {
  initializeAlarmNotifications,
  ACTION_DISMISS_ALL,
  ACTION_DISMISS_SINGLE,
  ACTION_SNOOZE_NEXT,
  ACTION_SNOOZE_SINGLE,
} from './src/core/notifications/alarmNotifier';
import { alarmSoundPlayer } from './src/core/audio/alarmSoundPlayer';

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

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync().catch(() => {});
}

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
  const triggerFromNotification = useAlarmStore((s) => s.triggerFromNotification);
  const checkAlarmTriggerTick = useAlarmStore((s) => s.checkAlarmTriggerTick);
  const themeMode = useSettingsStore((s) => s.themeMode);

  useEffect(() => {
    void useSettingsStore.getState().loadSettings();

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

    const initPromise = initialize();
    void initializeAlarmNotifications();

    const handledResponseKeys = new Set<string>();

    const syncPresentedOrDueAlarms = async () => {
      checkAlarmTriggerTick();
      if (Platform.OS === 'web' || useAlarmStore.getState().activeRinging) {
        return;
      }
      try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        const storeState = useAlarmStore.getState();
        const nowMs = Date.now();

        for (const notif of presented) {
          const data = notif.request?.content?.data;
          const alarmId = data?.alarmId as string | undefined;
          if (!alarmId) continue;

          if (alarmId !== 'power_nap') {
            const target = storeState.alarms.find((a) => a.id === alarmId);
            const isSnoozedInFuture = Boolean(
              target?.snoozedUntil && target.snoozedUntil > nowMs
            );
            const isPausedInFuture = Boolean(target?.pausedUntil && target.pausedUntil > nowMs);
            if (!target || !target.isEnabled || isPausedInFuture || isSnoozedInFuture) {
              void Notifications.dismissNotificationAsync(notif.request.identifier).catch(
                () => {}
              );
              continue;
            }
          }

          triggerFromNotification({
            alarmId,
            stepIndex: typeof data?.stepIndex === 'number' ? data.stepIndex : undefined,
            totalSteps: typeof data?.totalSteps === 'number' ? data.totalSteps : undefined,
            timeString: typeof data?.timeString === 'string' ? data.timeString : undefined,
            cycleDateStr: typeof data?.cycleDateStr === 'string' ? data.cycleDateStr : undefined,
            isSnooze: Boolean(data?.isSnooze),
          });
          if (useAlarmStore.getState().activeRinging) {
            break;
          }
        }
      } catch {}
    };

    // Active in-app alarm ticker running every 2 seconds for foreground/web reliability
    const tickInterval = setInterval(() => {
      checkAlarmTriggerTick();
    }, 2000);

    // Listen to notification responses (including lock screen actions)
    let subscription: Notifications.EventSubscription | null = null;
    let foregroundSubscription: Notifications.EventSubscription | null = null;
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void syncPresentedOrDueAlarms();
      }
    });

    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const notifId = response.notification?.request?.identifier ?? '';
      const actionIdentifier = response.actionIdentifier;
      const responseKey = `${notifId}_${actionIdentifier}`;
      if (notifId && handledResponseKeys.has(responseKey)) {
        return;
      }
      if (notifId) {
        handledResponseKeys.add(responseKey);
      }

      const data = response.notification.request.content.data;
      const alarmId = data?.alarmId as string;

      if (
        (actionIdentifier === ACTION_SNOOZE_NEXT || actionIdentifier === ACTION_SNOOZE_SINGLE) &&
        alarmId
      ) {
        alarmSoundPlayer.finishLockScreenAlarmIfLocked();
        const currentAlarms = useAlarmStore.getState().alarms;
        const target = currentAlarms.find((a) => a.id === alarmId);
        const defaultSnooze = useSettingsStore.getState().defaultSnoozeMinutes || 10;
        const snoozeDuration =
          target && target.type !== 'single' && !target.isEscalating
            ? target.intervalMinutes || defaultSnooze
            : defaultSnooze;
        void useAlarmStore.getState().snoozeAlarm(alarmId, snoozeDuration);
      } else if (actionIdentifier === ACTION_DISMISS_ALL && alarmId) {
        alarmSoundPlayer.finishLockScreenAlarmIfLocked();
        void dismissAllRemainingForToday(alarmId);
      } else if (actionIdentifier === ACTION_DISMISS_SINGLE && alarmId) {
        alarmSoundPlayer.finishLockScreenAlarmIfLocked();
        void dismissSingleAlarm(alarmId);
      } else if (alarmId) {
        // User tapped notification directly: open ringing overlay and record deduplication key
        triggerFromNotification({
          alarmId,
          stepIndex: typeof data?.stepIndex === 'number' ? data.stepIndex : undefined,
          totalSteps: typeof data?.totalSteps === 'number' ? data.totalSteps : undefined,
          timeString: typeof data?.timeString === 'string' ? data.timeString : undefined,
          cycleDateStr: typeof data?.cycleDateStr === 'string' ? data.cycleDateStr : undefined,
          isSnooze: Boolean(data?.isSnooze),
        });
      }
    };

    if (Platform.OS !== 'web') {
      subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

      // Handle cold start launch from tapping a notification or fullScreenIntent wakeup after alarms have loaded
      void initPromise.then(() => {
        void syncPresentedOrDueAlarms();
        Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
          if (lastResponse) {
            handleNotificationResponse(lastResponse);
            void Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
          }
        });
      });

      // Listen to incoming foreground notifications
      foregroundSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
          const data = notification.request.content.data;
          const alarmId = data?.alarmId as string;
          if (alarmId) {
            triggerFromNotification({
              alarmId,
              stepIndex: typeof data?.stepIndex === 'number' ? data.stepIndex : undefined,
              totalSteps: typeof data?.totalSteps === 'number' ? data.totalSteps : undefined,
              timeString: typeof data?.timeString === 'string' ? data.timeString : undefined,
              cycleDateStr: typeof data?.cycleDateStr === 'string' ? data.cycleDateStr : undefined,
              isSnooze: Boolean(data?.isSnooze),
            });
          }
        }
      );
    }

    return () => {
      clearInterval(tickInterval);
      subscription?.remove();
      foregroundSubscription?.remove();
      appStateSubscription.remove();
    };
  }, [
    initialize,
    dismissAllRemainingForToday,
    dismissSingleAlarm,
    triggerFromNotification,
    checkAlarmTriggerTick,
  ]);

  useEffect(() => {
    if (fontsLoaded && Platform.OS !== 'web') {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

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
        <View
          style={[
            styles.webOuter,
            themeMode === 'light' && { backgroundColor: '#F5F6F9' },
          ]}
        >
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
