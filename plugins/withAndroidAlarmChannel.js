const {
  withAndroidManifest,
  withMainActivity,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ALARM_SOUND_MODULE_CODE = `package com.alarming.app

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.WindowManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class AlarmSoundModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "AlarmSound"

    init {
        activeReactContext = reactContext
    }

    companion object {
        @Volatile
        private var ringtone: Ringtone? = null

        @Volatile
        private var wakeLock: PowerManager.WakeLock? = null

        @Volatile
        private var activeReactContext: ReactApplicationContext? = null

        fun isAlarmCurrentlyRinging(): Boolean {
            return ringtone?.isPlaying == true
        }

        fun emitVolumeButtonPressed(): Boolean {
            val ctx = activeReactContext ?: return false
            if (!isAlarmCurrentlyRinging()) return false
            return try {
                ctx
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onHardwareVolumeButtonPressed", null)
                true
            } catch (e: Exception) {
                false
            }
        }

        @Synchronized
        fun acquireWakeLock(context: Context) {
            try {
                if (wakeLock?.isHeld == true) {
                    return
                }
                val powerManager =
                    context.applicationContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                @Suppress("DEPRECATION")
                wakeLock = powerManager?.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                        PowerManager.ACQUIRE_CAUSES_WAKEUP or
                        PowerManager.ON_AFTER_RELEASE,
                    "alarming:AlarmWakeLock"
                )?.apply {
                    setReferenceCounted(false)
                    acquire(10 * 60 * 1000L)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @Synchronized
        fun releaseWakeLock() {
            try {
                if (wakeLock?.isHeld == true) {
                    wakeLock?.release()
                }
                wakeLock = null
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @Synchronized
        fun startRingtone(context: Context) {
            try {
                acquireWakeLock(context)
                if (ringtone?.isPlaying == true) {
                    return
                }
                val appContext = context.applicationContext
                val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                    ?: Settings.System.DEFAULT_ALARM_ALERT_URI

                ringtone = RingtoneManager.getRingtone(appContext, uri)?.apply {
                    audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        isLooping = true
                    }
                    play()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        @Synchronized
        fun stopRingtone() {
            try {
                ringtone?.stop()
                ringtone = null
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                releaseWakeLock()
            }
        }
    }

    @ReactMethod
    fun playAlarmSound() {
        try {
            val context = reactApplicationContext
            startRingtone(context)

            val activity: Activity? = reactApplicationContext.currentActivity
            activity?.runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                        activity.setShowWhenLocked(true)
                        activity.setTurnScreenOn(true)
                    }
                    @Suppress("DEPRECATION")
                    activity.window.addFlags(
                        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    )
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            // If device is locked or screen was off when JS ticker triggered the alarm,
            // bring MainActivity to the front over the keyguard.
            val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (keyguardManager?.isKeyguardLocked == true || powerManager?.isInteractive == false) {
                try {
                    val launchIntent = Intent(context, MainActivity::class.java).apply {
                        addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                Intent.FLAG_ACTIVITY_NO_USER_ACTION
                        )
                    }
                    context.startActivity(launchIntent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun stopAlarmSound() {
        try {
            stopRingtone()
            val activity: Activity? = reactApplicationContext.currentActivity
            activity?.runOnUiThread {
                try {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun finishLockScreenAlarmIfLocked() {
        try {
            stopRingtone()
            val context = reactApplicationContext
            val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            val isLocked = keyguardManager?.isKeyguardLocked == true
            val activity: Activity? = reactApplicationContext.currentActivity
            activity?.runOnUiThread {
                try {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    if (isLocked) {
                        activity.moveTaskToBack(true)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun canUseFullScreenIntent(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val notificationManager =
                    reactApplicationContext.getSystemService(NotificationManager::class.java)
                promise.resolve(notificationManager?.canUseFullScreenIntent() ?: true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun openFullScreenIntentSettings() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val context = reactApplicationContext
                val intent = Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT).apply {
                    data = Uri.parse("package:\${context.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(intent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun getDeviceSafetyStatus(promise: Promise) {
        try {
            val context = reactApplicationContext
            val batteryManager = context.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
            val batteryLevel = batteryManager?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
            val isCharging = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                batteryManager?.isCharging ?: true
            } else {
                true
            }

            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            val currentVol = audioManager?.getStreamVolume(AudioManager.STREAM_ALARM) ?: 7
            val maxVol = (audioManager?.getStreamMaxVolume(AudioManager.STREAM_ALARM) ?: 7).coerceAtLeast(1)
            val alarmVolumePercent = ((currentVol.toDouble() / maxVol.toDouble()) * 100.0).toInt()

            val canUseFullScreen = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                val notificationManager = context.getSystemService(NotificationManager::class.java)
                notificationManager?.canUseFullScreenIntent() ?: true
            } else {
                true
            }

            val map = Arguments.createMap().apply {
                putInt("batteryLevel", batteryLevel)
                putBoolean("isCharging", isCharging)
                putInt("alarmVolumePercent", alarmVolumePercent)
                putBoolean("canUseFullScreenIntent", canUseFullScreen)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            val fallback = Arguments.createMap().apply {
                putInt("batteryLevel", 100)
                putBoolean("isCharging", true)
                putInt("alarmVolumePercent", 100)
                putBoolean("canUseFullScreenIntent", true)
            }
            promise.resolve(fallback)
        }
    }
}
`;

const ALARM_SOUND_PACKAGE_CODE = `package com.alarming.app

import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AlarmSoundPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AlarmSoundModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<View, *>> {
        return emptyList()
    }
}
`;

const ALARM_NOTIFICATIONS_SERVICE_CODE = `package com.alarming.app

import android.app.KeyguardManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationBehaviorRecord
import expo.modules.notifications.notifications.model.NotificationResponse
import expo.modules.notifications.notifications.presentation.builders.ExpoNotificationBuilder
import expo.modules.notifications.service.NotificationsService
import expo.modules.notifications.service.delegates.ExpoHandlingDelegate
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate
import expo.modules.notifications.service.delegates.SharedPreferencesNotificationCategoriesStore
import expo.modules.notifications.service.interfaces.PresentationDelegate

class AlarmNotificationBuilder(
    context: Context,
    notification: Notification,
    store: SharedPreferencesNotificationCategoriesStore
) : ExpoNotificationBuilder(context, notification, store) {

    private fun isAlarmNotification(): Boolean {
        val body = notificationContent.body
        return body?.has("alarmId") == true
    }

    private fun createFullScreenPendingIntent(): PendingIntent {
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_NO_USER_ACTION
            val body = notificationContent.body
            if (body != null) {
                putExtra("alarmId", body.optString("alarmId", ""))
                if (body.has("stepIndex")) {
                    putExtra("stepIndex", body.optInt("stepIndex", 0))
                }
                if (body.has("totalSteps")) {
                    putExtra("totalSteps", body.optInt("totalSteps", 1))
                }
                if (body.has("timeString")) {
                    putExtra("timeString", body.optString("timeString", ""))
                }
                if (body.has("cycleDateStr")) {
                    putExtra("cycleDateStr", body.optString("cycleDateStr", ""))
                }
            }
        }
        val requestCode = notification.notificationRequest.identifier.hashCode()
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        return PendingIntent.getActivity(context, requestCode, launchIntent, flags)
    }

    override fun addActionsToBuilder(
        builder: NotificationCompat.Builder,
        categoryIdentifier: String
    ) {
        super.addActionsToBuilder(builder, categoryIdentifier)
        if (isAlarmNotification()) {
            builder.setCategory(NotificationCompat.CATEGORY_ALARM)
            builder.setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            builder.setPriority(NotificationCompat.PRIORITY_MAX)
            builder.setOngoing(true)
            builder.setFullScreenIntent(createFullScreenPendingIntent(), true)
        }
    }

    override suspend fun build(): android.app.Notification {
        val built = super.build()
        if (isAlarmNotification()) {
            built.category = android.app.Notification.CATEGORY_ALARM
            built.visibility = android.app.Notification.VISIBILITY_PUBLIC
            if (built.fullScreenIntent == null) {
                built.fullScreenIntent = createFullScreenPendingIntent()
            }
        }
        return built
    }
}

class AlarmPresentationDelegate(
    context: Context
) : ExpoPresentationDelegate(context) {

    override suspend fun createNotification(
        notification: Notification,
        notificationBehavior: NotificationBehaviorRecord?
    ): android.app.Notification =
        AlarmNotificationBuilder(
            context,
            notification,
            SharedPreferencesNotificationCategoriesStore(context)
        ).apply {
            setAllowedBehavior(notificationBehavior)
        }.build()

    override fun presentNotification(
        notification: Notification,
        behavior: NotificationBehaviorRecord?
    ) {
        super.presentNotification(notification, behavior)

        val body = notification.notificationRequest.content.body
        if (body?.has("alarmId") == true) {
            // Wake screen and start looping alarm sound immediately
            AlarmSoundModule.startRingtone(context)

            val keyguardManager = context.getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            val isLockedOrScreenOff =
                (keyguardManager?.isKeyguardLocked == true) || (powerManager?.isInteractive == false)

            if (isLockedOrScreenOff) {
                try {
                    val launchIntent = Intent(context, MainActivity::class.java).apply {
                        addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                Intent.FLAG_ACTIVITY_NO_USER_ACTION
                        )
                        putExtra("alarmId", body.optString("alarmId", ""))
                    }
                    context.startActivity(launchIntent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
}

class AlarmNotificationsService : NotificationsService() {
    override fun getPresentationDelegate(context: Context): PresentationDelegate =
        AlarmPresentationDelegate(context)

    override fun onReceiveNotificationResponse(context: Context, intent: Intent) {
        try {
            val response = getNotificationResponseFromBroadcastIntent(intent)
            val actionId = response.actionIdentifier
            if (actionId != NotificationResponse.DEFAULT_ACTION_IDENTIFIER) {
                // Immediately stop ringtone and dismiss notification natively when action button is pressed
                AlarmSoundModule.stopRingtone()
                val notifId = response.notification.notificationRequest.identifier
                getPresentationDelegate(context).dismissNotifications(listOf(notifId))

                // If the app process was killed (no active JS listeners), wake the app to process snooze/dismiss state
                if (ExpoHandlingDelegate(context).getListeners().isEmpty()) {
                    ExpoHandlingDelegate.openAppToForeground(context, response)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        super.onReceiveNotificationResponse(context, intent)
    }
}
`;

function withAndroidAlarmPermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    if (!androidManifest.$) {
      androidManifest.$ = {};
    }
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const permissionsToAdd = [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.DISABLE_KEYGUARD',
      'android.permission.VIBRATE',
      'android.permission.WAKE_LOCK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ];

    permissionsToAdd.forEach((perm) => {
      const exists = androidManifest['uses-permission'].some(
        (p) => p.$['android:name'] === perm
      );
      if (!exists) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    });

    const mainApplication = androidManifest.application?.[0];
    if (mainApplication) {
      if (!mainApplication.activity) {
        mainApplication.activity = [];
      }

      // 1. Configure MainActivity to show over lock screen and turn screen on
      const mainActivity = mainApplication.activity.find(
        (act) =>
          act.$?.['android:name'] === '.MainActivity' ||
          act.$?.['android:name']?.endsWith('.MainActivity')
      );
      if (mainActivity && mainActivity.$) {
        mainActivity.$['android:showWhenLocked'] = 'true';
        mainActivity.$['android:turnScreenOn'] = 'true';
      }

      // 2. Configure NotificationForwarderActivity to also work over lock screen without keyguard prompt
      const forwarderName =
        'expo.modules.notifications.service.NotificationForwarderActivity';
      const existingForwarder = mainApplication.activity.find(
        (act) => act.$?.['android:name'] === forwarderName
      );
      if (existingForwarder && existingForwarder.$) {
        existingForwarder.$['android:showWhenLocked'] = 'true';
        existingForwarder.$['android:turnScreenOn'] = 'true';
        existingForwarder.$['tools:node'] = 'merge';
      } else {
        mainApplication.activity.push({
          $: {
            'android:name': forwarderName,
            'android:showWhenLocked': 'true',
            'android:turnScreenOn': 'true',
            'tools:node': 'merge',
          },
        });
      }

      // 3. Register high-priority AlarmNotificationsService receiver
      if (!mainApplication.receiver) {
        mainApplication.receiver = [];
      }
      const receiverName = '.AlarmNotificationsService';
      const hasAlarmReceiver = mainApplication.receiver.some(
        (r) => r.$?.['android:name'] === receiverName
      );
      if (!hasAlarmReceiver) {
        mainApplication.receiver.push({
          $: {
            'android:name': receiverName,
            'android:enabled': 'true',
            'android:exported': 'false',
          },
          'intent-filter': [
            {
              $: {
                'android:priority': '1',
              },
              action: [
                {
                  $: {
                    'android:name':
                      'expo.modules.notifications.NOTIFICATION_EVENT',
                  },
                },
                {
                  $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' },
                },
                { $: { 'android:name': 'android.intent.action.REBOOT' } },
                {
                  $: {
                    'android:name': 'android.intent.action.QUICKBOOT_POWERON',
                  },
                },
                {
                  $: {
                    'android:name': 'com.htc.intent.action.QUICKBOOT_POWERON',
                  },
                },
                {
                  $: {
                    'android:name':
                      'android.intent.action.MY_PACKAGE_REPLACED',
                  },
                },
              ],
            },
          ],
        });
      }
    }

    return config;
  });
}

function withAndroidAlarmFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const targetDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java/com/alarming/app'
      );
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(
        path.join(targetDir, 'AlarmSoundModule.kt'),
        ALARM_SOUND_MODULE_CODE,
        'utf8'
      );
      fs.writeFileSync(
        path.join(targetDir, 'AlarmSoundPackage.kt'),
        ALARM_SOUND_PACKAGE_CODE,
        'utf8'
      );
      fs.writeFileSync(
        path.join(targetDir, 'AlarmNotificationsService.kt'),
        ALARM_NOTIFICATIONS_SERVICE_CODE,
        'utf8'
      );

      return config;
    },
  ]);
}

function withAndroidAlarmMainApplication(config) {
  return withMainApplication(config, async (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('AlarmSoundPackage()')) {
      if (contents.includes('val packages = PackageList(this).packages')) {
        contents = contents.replace(
          'val packages = PackageList(this).packages',
          'val packages = PackageList(this).packages.toMutableList().apply { add(AlarmSoundPackage()) }'
        );
      } else if (contents.includes('PackageList(this).packages')) {
        contents = contents.replace(
          'PackageList(this).packages',
          'PackageList(this).packages.toMutableList().apply { add(AlarmSoundPackage()) }'
        );
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

function withAndroidAlarmChannelNative(config) {
  return withMainActivity(config, async (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('alarming_interval_alarm_channel_v3')) {
      const channelCreationCode = `
    // [Alarming] Allow Alarm UI to display over lock screen and wake display without requiring unlock
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }
    @Suppress("DEPRECATION")
    window.addFlags(
      android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
        android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
        android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
    )

    // [Alarming] Bind notification channel to device's Clock App alarm sound (TYPE_ALARM)
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val channelId = "alarming_interval_alarm_channel_v3"
      val alarmSoundUri = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM)
        ?: android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI
      val audioAttributes = android.media.AudioAttributes.Builder()
        .setUsage(android.media.AudioAttributes.USAGE_ALARM)
        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
      val channel = android.app.NotificationChannel(channelId, "Alarming Wakeup", android.app.NotificationManager.IMPORTANCE_HIGH).apply {
        setSound(alarmSoundUri, audioAttributes)
        enableVibration(true)
        vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
        lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        setBypassDnd(true)
      }
      val notificationManager = getSystemService(android.app.NotificationManager::class.java)
      notificationManager?.createNotificationChannel(channel)
    }
`;

      // Inject after super.onCreate
      if (contents.includes('super.onCreate(')) {
        contents = contents.replace(
          /(super\.onCreate\([^)]*\);?)/,
          `$1\n${channelCreationCode}`
        );
      }
    }

    if (!contents.includes('emitVolumeButtonPressed')) {
      const volumeKeyMethod = `
  override fun dispatchKeyEvent(event: android.view.KeyEvent): Boolean {
    val keyCode = event.keyCode
    if (keyCode == android.view.KeyEvent.KEYCODE_VOLUME_UP || keyCode == android.view.KeyEvent.KEYCODE_VOLUME_DOWN) {
      if (AlarmSoundModule.isAlarmCurrentlyRinging()) {
        if (event.action == android.view.KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
          AlarmSoundModule.emitVolumeButtonPressed()
        }
        return true
      }
    }
    return super.dispatchKeyEvent(event)
  }
}`;
      const lastBraceIdx = contents.lastIndexOf('}');
      if (lastBraceIdx !== -1) {
        contents = contents.slice(0, lastBraceIdx) + volumeKeyMethod;
      }
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withAlarmingAndroidConfig(config) {
  return withAndroidAlarmChannelNative(
    withAndroidAlarmMainApplication(
      withAndroidAlarmFiles(
        withAndroidAlarmPermissions(config)
      )
    )
  );
};
