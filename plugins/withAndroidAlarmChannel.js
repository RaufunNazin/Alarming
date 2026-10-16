const {
  withAndroidManifest,
  withMainActivity,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ALARM_SOUND_MODULE_CODE = `package com.alarming.app

import android.media.AudioAttributes
import android.media.Ringtone
import android.media.RingtoneManager
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AlarmSoundModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "AlarmSound"

    companion object {
        private var ringtone: Ringtone? = null
    }

    @ReactMethod
    fun playAlarmSound() {
        try {
            if (ringtone?.isPlaying == true) {
                return
            }
            val context = reactApplicationContext
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                ?: Settings.System.DEFAULT_ALARM_ALERT_URI

            ringtone = RingtoneManager.getRingtone(context, uri)?.apply {
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

    @ReactMethod
    fun stopAlarmSound() {
        try {
            ringtone?.stop()
            ringtone = null
        } catch (e: Exception) {
            e.printStackTrace()
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

function withAndroidAlarmPermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    const permissionsToAdd = [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
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

    // Check if channel v3 is already injected
    if (contents.includes('alarming_interval_alarm_channel_v3')) {
      return config;
    }

    const channelCreationCode = `
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
