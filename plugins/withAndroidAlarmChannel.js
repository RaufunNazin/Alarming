const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

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

function withAndroidAlarmChannelNative(config) {
  return withMainActivity(config, async (config) => {
    let contents = config.modResults.contents;

    // Check if channel creation is already injected
    if (contents.includes('alarming_interval_alarm_channel_v2')) {
      return config;
    }

    const channelCreationCode = `
    // [Alarming] Bind notification channel to device's Clock App alarm sound (TYPE_ALARM)
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val channelId = "alarming_interval_alarm_channel_v2"
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
  return withAndroidAlarmChannelNative(withAndroidAlarmPermissions(config));
};
