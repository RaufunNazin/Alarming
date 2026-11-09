import { AppLanguage, useSettingsStore } from '../settings/settingsStore';

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/**
 * Converts ASCII digits (0-9) in a string or number to Bangla digits (০-৯) when language === 'bn'.
 */
export function formatNumberLocalized(value: number | string, language: AppLanguage): string {
  const str = String(value);
  if (language !== 'bn') return str;
  return str.replace(/[0-9]/g, (d) => BANGLA_DIGITS[Number(d)] ?? d);
}

/**
 * Formats 24-hour (hour, minute) into localized 12-hour string, e.g. "06:30 AM" or "০৬:৩০ এএম"
 */
export function formatTime12hLocalized(
  hour: number,
  minute: number,
  language: AppLanguage
): { time: string; period: string; full: string } {
  const period =
    hour >= 12
      ? language === 'bn'
        ? 'পিএম'
        : 'PM'
      : language === 'bn'
        ? 'এএম'
        : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const hStr = String(displayHour).padStart(2, '0');
  const mStr = String(minute).padStart(2, '0');
  const rawTime = `${hStr}:${mStr}`;
  const time = formatNumberLocalized(rawTime, language);
  return {
    time,
    period,
    full: `${time} ${period}`,
  };
}

const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTHS_BN = [
  'জানু',
  'ফেব্রু',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টে',
  'অক্টো',
  'নভে',
  'ডিসে',
];

export function formatUpdateTimestampLocalized(
  timestampMs: number,
  language: AppLanguage
): string {
  const d = new Date(timestampMs);
  if (isNaN(d.getTime())) {
    return language === 'bn' ? 'সর্বশেষ বিল্ড' : 'Latest build';
  }
  const monthIdx = d.getMonth();
  const day = formatNumberLocalized(d.getDate(), language);
  const year = formatNumberLocalized(d.getFullYear(), language);
  const time12 = formatTime12hLocalized(d.getHours(), d.getMinutes(), language).full;
  if (language === 'bn') {
    return `${day} ${MONTHS_BN[monthIdx]} ${year}, ${time12}`;
  }
  return `${MONTHS_EN[monthIdx]} ${day}, ${year}, ${time12}`;
}

export const TRANSLATIONS = {
  en: {
    // Header & Home
    appTitle: 'Alarms',
    settingsTitle: 'Settings',
    noAlarmsTitle: 'No Alarms Yet',
    noAlarmsSub: 'Tap + to set an alarm',
    powerNapLabel: 'Power Nap',
    powerNapButtonShort: (mins: number) => `${mins}m Nap`,
    powerNapHint: 'Hold to change time',
    powerNapTapToCancel: 'Tap to cancel',
    cancelPowerNapTitle: 'Cancel Power Nap?',
    cancelPowerNapBody: 'Your active power nap timer will be stopped.',
    keepNapBtn: 'Keep Nap',
    cancelNapBtn: 'Cancel Nap',
    powerNapStartedToast: (mins: number) => `Power nap set for ${mins} minutes`,
    powerNapCancelledToast: 'Power nap cancelled',

    // Periods & Days
    am: 'AM',
    pm: 'PM',
    everyday: 'Every day',
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    once: 'Once',
    dayInitials: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

    // Card Badges & Info
    escalatingBadge: 'Escalating',
    escalatingBeforeBadge: 'Escalating Before',
    escalatingAfterBadge: 'Escalating After',
    everyNMinBadge: (mins: number) => `Every ${mins}m`,
    beforeBadge: (count: number, mins: number) => `${count}x Before (${mins}m)`,
    afterBadge: (count: number, mins: number) => `${count}x After (${mins}m)`,
    alarmsActiveOfTotal: (active: number, total: number) =>
      `${active} of ${total} ${total === 1 ? 'alarm' : 'alarms'}`,
    alarmsCountSummary: (count: number) => `${count} ${count === 1 ? 'alarm' : 'alarms'}`,

    // Creation & Edit Modals
    newAlarmTitle: 'New Alarm',
    editAlarmTitle: 'Edit Alarm',
    cancel: 'Cancel',
    save: 'Save',
    saveChanges: 'Save',
    delete: 'Delete',
    done: 'Done',
    alarmLabelPlaceholder: 'Alarm Label',

    // Modes
    modeSingle: 'Single',
    modeWindow: 'Window',
    modeOffset: 'Before / After',
    startTime: 'Start Time',
    endTime: 'End Time',
    alarmTime: 'Alarm Time',
    targetTime: 'Main Time',
    intervalLabel: 'Gap Between Alarms',
    everyNMin: (mins: number) => `Every ${mins} min`,
    nMin: (mins: number) => `${mins} min`,
    directionLabel: 'Ring Direction',
    before: 'Before',
    after: 'After',
    alarmsCountLabel: 'Number of Alarms',
    repeatDaysLabel: 'Repeat Days',
    repeatLabel: 'Repeat',

    // Escalating Info Banner
    escalatingModeActiveTitle: 'Escalating Alarms On',
    escalatingModeDesc: 'Alarms ring closer together: 15m → 10m → 5m → 3m → 2m → 1m',
    escalatingWindowDesc:
      'Alarms ring more often as End Time gets closer (20m → 15m → 10m → 5m → 3m → 2m → 1m)',
    generatesNAlarms: (count: number) => `${count} ${count === 1 ? 'alarm' : 'alarms'}`,

    // Granular Sequence Section
    alarmSequenceTitle: (count: number) => `Alarm List (${count})`,
    alarmSequencePartialTitle: (enabled: number, total: number) =>
      `Alarm List (${enabled}/${total} on)`,
    alarmSequenceHint: 'Tap a time to change it, or switch individual alarms on or off.',
    resetCustomTimings: 'Reset Times',
    stepStart: 'Start',
    stepEnd: 'End',
    stepTarget: 'Main',
    stepN: (n: number) => `Alarm ${n}`,
    adjustStepN: (n: number) => `Adjust Alarm ${n}`,

    // Clock & Keypad Input
    ringsInShort: 'Rings in',
    selectTime: 'Done',
    typeInTime: 'Type time',
    hourLabel: 'Hour',
    minuteLabel: 'Minute',
    useKeyboardTooltip: 'Type time with keypad',
    useDialTooltip: 'Pick time on clock dial',

    // Ringing Overlay
    ringingNow: "Time's up!",
    timesUp: "Time's up!",
    defaultIntervalAlarmTitle: 'Alarm',
    intervalCascadeSub: (mins: number) => `Rings every ${mins}m`,
    escalatingCascadeSub: 'Escalating Alarms',
    snoozeBtn: (mins: number) => `Snooze (${mins}m)`,
    dismissAlarmBtn: 'Stop Alarm',

    // Power Nap Preset Modal
    powerNapPresetTitle: 'Power Nap Time',
    powerNapPresetDesc:
      'Pick your power nap length. Tap the Nap button on the home screen to start right away, or hold it to change.',
    quickPresetsLabel: 'Choose Duration',
    customDurationLabel: 'Custom Duration (minutes)',
    savePresetBtn: 'Save Default',
    startNapNowBtn: (mins: number) => `Start ${mins}m Nap`,

    // Settings Modal
    sectionAppearance: 'Look & Language',
    themeLabel: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    languageLabel: 'Language',
    langEnglish: 'English',
    langBangla: 'বাংলা',

    sectionAlarmType: 'Multi-Alarm Style',
    intervalAlarmTypeLabel: 'Alarm Spacing Style',
    selectAlarmTypeModalTitle: 'Choose Alarm Spacing Style',
    selectAlarmTypeModalDesc:
      'Pick how multiple alarms are spaced in Window and Before/After modes.',
    typeStandardTitle: 'Fixed Gap (Standard)',
    typeStandardShort: 'Fixed Gap',
    typeStandardDesc:
      'Alarms ring at a fixed gap (for example, every 10 minutes) for your chosen number of times.',
    typeEscalatingTitle: 'Escalating (Closer Together)',
    typeEscalatingShort: 'Escalating',
    typeEscalatingDesc:
      'Alarms automatically ring closer together as wake-up time approaches (15m → 10m → 5m → 3m → 2m → 1m).',

    sectionDefaults: 'Default Times',
    defaultIntervalLabel: 'Default Gap',
    defaultStepsLabel: 'Default Alarm Count',
    defaultWindowDurationLabel: 'Default Window Length',
    defaultDirectionLabel: 'Default Direction',
    defaultSnoozeLabel: 'Default Snooze',
    defaultPowerNapLabel: 'Default Power Nap',

    sectionFeatures: 'Feature Toggles',
    toggleSequenceTitle: 'Show Individual Alarm List',
    toggleSequenceDesc:
      'Show the full list of individual alarm times inside Edit Alarm so you can adjust or turn off specific steps.',
    toggleCreationControlsTitle: 'Show Extra Options When Adding',
    toggleCreationControlsDesc:
      'Show gap, alarm count, and direction controls when creating a new alarm.',
    toggleKeypadInputTitle: 'Keypad Time Input',
    toggleKeypadInputDesc: 'Allow typing alarm times with the number keypad.',
    togglePowerNapTitle: 'Show Power Nap Button',
    togglePowerNapDesc: 'Show the quick Power Nap button at the bottom of the home screen.',
    toggleToastsTitle: 'Show Confirmation Messages',
    toggleToastsDesc: 'Show a popup message telling you how long until the alarm rings.',
    resetSettingsBtn: 'Restore Defaults',
    resetSettingsConfirmTitle: 'Restore Default Settings?',
    resetSettingsConfirmBody:
      'This will reset your theme, default times, and custom categories back to their original defaults. Your saved alarms will not be deleted.',
    resetSettingsToast: 'Default settings restored',
    viewSourceCodeBtn: 'View Source Code',
    checkForUpdatesBtn: 'Check for Updates',
    checkingUpdatesBtn: 'Checking for Updates...',
    updateLatestToast: 'You are on the latest version (v1.0.0)',
    updateLatestWithTimeToast: (version: string, dateStr: string) =>
      `Latest version (v${version}) • Updated ${dateStr}`,
    updateDownloadingToast: 'Update found! Downloading & restarting...',
    updateApplyingToast: 'Installing new update...',
    updateAppliedToast: (version: string) => `Updated to latest v${version}`,
    updateCardSubtitle: (version: string, dateStr: string) =>
      `Latest v${version} • Updated ${dateStr}`,
    lastUpdatedBadge: (dateStr: string) => `Last updated: ${dateStr}`,
    whatsNewModalTitle: (version: string) => `What's New in v${version}`,
    updateDevModeToast: 'v1.0.0 • OTA updates run in release/APK builds',
    updateErrorToast: 'Could not check for updates right now',
    changelogBtn: 'Changelog (v1.0.0)',
    changelogModalTitle: 'Release Notes — v1.0.0',
    changelogModalSub: 'Initial release of Alarming with full interval & escalating alarm engine.',
    changelogSectionsV100: [
      {
        title: 'Alarm Engine & Modes',
        items: [
          'Single, Window (Start to End), and Before/After alarm cascades.',
          'Standard fixed intervals and Escalating intervals (15m → 10m → 5m → 3m → 2m → 1m).',
          'Expandable individual alarm sequence editor to toggle or fine-tune specific steps.',
        ],
      },
      {
        title: 'Categories & Smart Scheduling',
        items: [
          'Custom category tags with smart 12:00 AM midnight pause (Off for Today / Off Through Tomorrow) and accurate overnight cycle tracking.',
          'Category-scoped "Already awake?" early skip banner and Skip Next occurrence.',
          'Quick Power Nap timer with customizable duration presets and 5-minute fine-tuning stepper.',
        ],
      },
      {
        title: 'UI, Responsiveness & OTA Updates',
        items: [
          'Responsive scaling across 720p compact phones, standard phones, and tablets with full 3-button & gesture navigation safe areas.',
          'Refined container corners, containerless ringing clock, compact AM/PM on alarm cards, full-card touch targets, and smart-disambiguated radial clock dial (full-ring & thumb drag + tap with scroll protection).',
          'Full-bleed adaptive clock icon with edge-aligned red bezel and lightweight (~15 MB) arm64 production APK build.',
          'Over-The-Air (OTA) auto-update with toast confirmation for patches, automatic changelog modal for new versions, and live update timestamp in Settings.',
        ],
      },
    ],

    // Settings ? Tooltips (Simple & clear for every option)
    tooltipTheme: 'Switch between dark mode (best for night) and light mode.',
    tooltipLanguage: 'Change the app language between English and Bangla.',
    tooltipSafetyCheck:
      'Shows a status icon at the top to verify alarm permissions and system readiness.',
    tooltipVolumeButtons:
      'Choose what happens when you press your phone volume buttons while an alarm is ringing.',
    tooltipEarlyDismiss:
      'Shows an "I\'m already awake" button before your alarm rings so you can skip it for today.',
    tooltipCategories:
      'Add or remove category tags (like Work or Workout) to organize and pause alarms together.',
    tooltipAlarmType:
      'Choose between a fixed minute gap or escalating alarms that ring closer together.',
    tooltipDefaultSnooze: 'How many minutes an alarm waits when you tap Snooze.',
    tooltipDefaultInterval: 'Default minute gap between alarms in Window and Before/After modes.',
    tooltipDefaultSteps: 'Default number of alarms created in Before/After mode.',
    tooltipDefaultWindow: 'Default time span between Start Time and End Time in Window mode.',
    tooltipDefaultDirection:
      'Whether Before/After alarms ring leading up to your time (Before) or starting from it (After).',
    tooltipDefaultPowerNap:
      'Default duration when you tap the Power Nap button on the home screen.',
    tooltipShowSequence:
      'Show the expandable list of every individual alarm step when editing an alarm.',
    tooltipShowAdvanced:
      'Show gap, alarm count, and direction controls right inside the New Alarm screen.',
    tooltipKeypadInput:
      'Show the keypad icon when setting an alarm so you can type the exact hour and minute.',
    tooltipShowPowerNap: 'Show or hide the quick Power Nap button on the home screen.',
    tooltipShowToasts: 'Show a message at the bottom when you save or turn on an alarm.',

    // Header Safety Status Icon Messages
    noUpcomingAlarms: 'No upcoming alarms',
    nextAlarmPrefix: 'Next',
    nextAlarmHeaderBadge: (countdown: string, timeStr: string) =>
      `Next: ${countdown} • ${timeStr}`,
    allSystemsGo: 'Everything is set up properly! Your alarms are ready to ring.',
    safetyAllSystemsGo: 'Everything is set up properly! Your alarms are ready to ring.',
    safetyPermissionsNeeded: 'Permissions needed so alarms can ring properly.',
    safetyBatteryLowPrefix: 'Battery low',
    safetyBatteryLowSuffix: '. Plug in charger so alarms ring on time.',
    safetyVolumeLow: 'Alarm volume is low. Turn up alarm volume to hear your alarms.',
    safetyNotificationsBlocked: 'Notifications are off. Tap to allow alarm alerts.',
    batteryLowWarn: (pct: number) =>
      `Battery low (${pct}%). Plug in charger so alarms ring on time.`,
    volumeLowWarn: (pct: number) =>
      `Alarm volume is low (${pct}%). Turn it up to hear your alarms.`,
    notificationsBlockedWarn: 'Notifications are off. Tap to allow alarm alerts.',

    // Early Dismissal ("I'm Already Awake")
    earlyDismissTitle: (label: string, mins: number) =>
      `${label || 'Alarm'} in ${mins} min`,
    earlyDismissAction: "I'm already awake (Skip today)",
    earlyDismissBannerTitle: (label: string, mins: number) =>
      `${label || 'Alarm'} rings in ${mins} min — Already awake?`,
    earlyDismissBannerSub: 'Tap to skip today without turning off your repeat schedule',
    earlyDismissConfirmToast: "Skipped today's upcoming alarm",

    // Skip Next Occurrence
    skipNextBtn: 'Skip Next',
    resumeNextBtn: 'Resume Next',
    skippingNextPrefix: 'Skipping:',
    resumedScheduleToast: 'Alarm schedule resumed',
    skippingNextBadge: (dateLabel: string) => `Skipping: ${dateLabel}`,
    pausedFor24hBadge: 'Off for 24h',

    // Categories & Smart Day-Boundary Group Pause
    categoryLabel: 'Category',
    categoryAll: 'All',
    categoryNone: 'None',
    groupToggleBtnOn: (cat: string) => `Turn on all ${cat} alarms`,
    groupToggleBtnOff: (cat: string) => `Turn off all ${cat} alarms for today`,
    groupToggleActionOn: (cat: string) => `Turn on all ${cat} alarms`,
    groupToggleActionOff: (cat: string) => `Turn off all ${cat} alarms for today`,
    groupToggleActionOffToday: (cat: string) => `Turn off all ${cat} alarms for today`,
    groupToggleActionOffTomorrow: (cat: string) => `Turn off all ${cat} alarms for tomorrow`,
    groupToggleSubHintToday: 'Until 12:00 AM',
    groupToggleSubHintTomorrow: 'Through tomorrow',
    groupToggleSubHintResume: 'Resume now',
    groupPauseModeTodayTitle: 'Rest of Today (Until 12:00 AM)',
    groupPauseModeTodayDesc:
      "Stops remaining alarms today. Tomorrow's alarms will ring on time.",
    groupPauseModeTomorrowTitle: 'Through Tomorrow (Until Tomorrow 12:00 AM)',
    groupPauseModeTomorrowDesc:
      'Pauses alarms for the rest of today and all day tomorrow.',
    groupToggleConfirmTitle: (cat: string, enable: boolean) =>
      enable ? `Turn On All ${cat} Alarms?` : `Pause ${cat} Alarms?`,
    groupToggleModalTitle: (cat: string, enable: boolean) =>
      enable ? `Turn On All ${cat} Alarms?` : `Pause ${cat} Alarms?`,
    groupToggleConfirmDesc: (cat: string, count: number, enable: boolean) =>
      enable
        ? `This will turn on all ${count} ${cat} ${count === 1 ? 'alarm' : 'alarms'} right now.`
        : `Choose how long to pause your ${count} ${cat} ${
            count === 1 ? 'alarm' : 'alarms'
          }. They will automatically turn back on at 12:00 AM.`,
    groupToggleModalBody: (cat: string, count: number, enable: boolean) =>
      enable
        ? `This will turn on all ${count} ${cat} ${count === 1 ? 'alarm' : 'alarms'} right now.`
        : `Choose how long to pause your ${count} ${cat} ${
            count === 1 ? 'alarm' : 'alarms'
          }. They will automatically turn back on at 12:00 AM.`,
    cancelBtn: 'Cancel',
    confirmBtn: 'Confirm',
    confirmActionBtn: 'Confirm',

    // Hardware Volume Buttons & Safety Settings
    sectionHardware: 'Safety & Controls',
    sectionSafetyAndHardware: 'Safety & Controls',
    volumeButtonsLabel: 'Volume Buttons',
    volumeButtonActionLabel: 'Volume Buttons (While Ringing)',
    volumeButtonActionDesc:
      'Choose what happens when you press volume buttons while an alarm rings.',
    volumeActionSnooze: 'Snooze',
    volumeActionDismiss: 'Stop',
    volumeActionNone: 'Nothing',
    volumeRingingHintSnooze: 'Press Volume button to Snooze',
    volumeRingingHintDismiss: 'Press Volume button to Stop',
    earlyDismissWindowLabel: 'Early Wake-Up Window',
    earlyDismissWindowDesc:
      'Show the "Already awake?" card when an alarm is ringing within this time.',
    safetyCheckToggleTitle: 'System & Permission Check',
    safetyCheckToggleDesc:
      'Show the status icon beside Settings to verify alarm permissions.',
    toggleSafetyCheckTitle: 'System & Permission Check',
    toggleSafetyCheckDesc:
      'Show the status icon beside Settings to verify alarm permissions.',

    // Duplicate, Swipe & Undo
    duplicateAlarmBtn: 'Duplicate',
    copySuffix: '(Copy)',
    editAction: 'Edit',
    deleteAction: 'Delete',
    swipeEditBtn: 'Edit',
    swipeDeleteBtn: 'Delete',
    alarmDeletedToast: 'Alarm deleted',
    alarmRestoredToast: 'Alarm restored',
    alarmDuplicatedToast: 'Alarm duplicated',
    undoBtn: 'UNDO',
    cardActionsTitle: 'Alarm Options',

    // Categories Management in Settings
    sectionCategories: 'Categories',
    categoriesManageLabel: 'Alarm Categories',
    manageCategoriesDesc: 'Add or remove category tags to group your alarms.',
    newCategoryPlaceholder: 'New category name...',
    addCategoryPlaceholder: 'New category name...',
    addCategoryBtn: 'Add',
  },
  bn: {
    // Header & Home
    appTitle: 'অ্যালার্ম',
    settingsTitle: 'সেটিংস',
    noAlarmsTitle: 'কোনো অ্যালার্ম নেই',
    noAlarmsSub: 'নতুন অ্যালার্ম সেট করতে + বাটনে ট্যাপ করুন',
    powerNapLabel: 'পাওয়ার ন্যাপ',
    powerNapButtonShort: (mins: number) => `${formatNumberLocalized(mins, 'bn')} মিঃ ন্যাপ`,
    powerNapHint: 'সময় বদলাতে ধরে রাখুন',
    powerNapTapToCancel: 'বাতিল করতে ট্যাপ করুন',
    cancelPowerNapTitle: 'পাওয়ার ন্যাপ বাতিল করবেন?',
    cancelPowerNapBody: 'আপনার চলমান পাওয়ার ন্যাপ টাইমারটি বন্ধ হয়ে যাবে।',
    keepNapBtn: 'চালু রাখুন',
    cancelNapBtn: 'বাতিল করুন',
    powerNapStartedToast: (mins: number) =>
      `${formatNumberLocalized(mins, 'bn')} মিনিটের পাওয়ার ন্যাপ সেট হয়েছে`,
    powerNapCancelledToast: 'পাওয়ার ন্যাপ বাতিল করা হয়েছে',

    // Periods & Days
    am: 'এএম',
    pm: 'পিএম',
    everyday: 'প্রতিদিন',
    weekdays: 'সোম–শুক্র',
    weekends: 'ছুটির দিন',
    once: 'একবার',
    dayInitials: ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'],
    dayNamesShort: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'],

    // Card Badges & Info
    escalatingBadge: 'ধাপে ধাপে ঘন',
    escalatingBeforeBadge: 'ধাপে ধাপে (আগে)',
    escalatingAfterBadge: 'ধাপে ধাপে (পরে)',
    everyNMinBadge: (mins: number) => `${formatNumberLocalized(mins, 'bn')} মিঃ পরপর`,
    beforeBadge: (count: number, mins: number) =>
      `আগে ${formatNumberLocalized(count, 'bn')}বার (${formatNumberLocalized(mins, 'bn')}মিঃ)`,
    afterBadge: (count: number, mins: number) =>
      `পরে ${formatNumberLocalized(count, 'bn')}বার (${formatNumberLocalized(mins, 'bn')}মিঃ)`,
    alarmsActiveOfTotal: (active: number, total: number) =>
      `${formatNumberLocalized(total, 'bn')}টার মধ্যে ${formatNumberLocalized(active, 'bn')}টা চালু`,
    alarmsCountSummary: (count: number) => `মোট ${formatNumberLocalized(count, 'bn')}টা অ্যালার্ম`,

    // Creation & Edit Modals
    newAlarmTitle: 'নতুন অ্যালার্ম',
    editAlarmTitle: 'অ্যালার্ম এডিট',
    cancel: 'বাতিল',
    save: 'সেভ',
    saveChanges: 'সেভ',
    delete: 'মুছে ফেলুন',
    done: 'ঠিক আছে',
    alarmLabelPlaceholder: 'অ্যালার্মের নাম',

    // Modes
    modeSingle: 'একবার',
    modeWindow: 'সময়সীমা',
    modeOffset: 'আগে / পরে',
    startTime: 'শুরুর সময়',
    endTime: 'শেষের সময়',
    alarmTime: 'অ্যালার্মের সময়',
    targetTime: 'মূল সময়',
    intervalLabel: 'কতক্ষণ পরপর',
    everyNMin: (mins: number) => `${formatNumberLocalized(mins, 'bn')} মিনিট পরপর`,
    nMin: (mins: number) => `${formatNumberLocalized(mins, 'bn')} মিনিট`,
    directionLabel: 'কখন বাজবে',
    before: 'আগে',
    after: 'পরে',
    alarmsCountLabel: 'কয়বার বাজবে',
    repeatDaysLabel: 'কোন কোন দিন',
    repeatLabel: 'কোন কোন দিন',

    // Escalating Info Banner
    escalatingModeActiveTitle: 'ধাপে ধাপে ঘন অ্যালার্ম চালু',
    escalatingModeDesc:
      'সময়ের সাথে অ্যালার্মের বিরতি কমতে থাকবে: ১৫মি → ১০মি → ৫মি → ৩মি → ২মি → ১মি',
    escalatingWindowDesc:
      'শেষের সময় যত কাছে আসবে, অ্যালার্ম তত ঘন ঘন বাজবে (২০মি → ১৫মি → ১০মি → ৫মি → ৩মি → ২মি → ১মি)',
    generatesNAlarms: (count: number) => `মোট ${formatNumberLocalized(count, 'bn')}বার বাজবে`,

    // Granular Sequence Section
    alarmSequenceTitle: (count: number) =>
      `অ্যালার্মের তালিকা (${formatNumberLocalized(count, 'bn')}টি)`,
    alarmSequencePartialTitle: (enabled: number, total: number) =>
      `অ্যালার্মের তালিকা (${formatNumberLocalized(total, 'bn')}টির মধ্যে ${formatNumberLocalized(enabled, 'bn')}টি চালু)`,
    alarmSequenceHint:
      'সময়ের ওপর ট্যাপ করে টাইম বদলান, অথবা পাশের বাটন দিয়ে নির্দিষ্ট অ্যালার্ম চালু বা বন্ধ করুন।',
    resetCustomTimings: 'রিসেট করুন',
    stepStart: 'শুরু',
    stepEnd: 'শেষ',
    stepTarget: 'মূল সময়',
    stepN: (n: number) => `${formatNumberLocalized(n, 'bn')} নং অ্যালার্ম`,
    adjustStepN: (n: number) => `${formatNumberLocalized(n, 'bn')} নং অ্যালার্মের সময়`,

    // Clock & Keypad Input
    ringsInShort: 'বাজবে',
    selectTime: 'ঠিক আছে',
    typeInTime: 'সময় লিখুন',
    hourLabel: 'ঘণ্টা',
    minuteLabel: 'মিনিট',
    useKeyboardTooltip: 'কিপ্যাডে সময় লিখুন',
    useDialTooltip: 'ঘড়ির কাঁটা ঘুরিয়ে সময় নিন',

    // Ringing Overlay
    ringingNow: 'সময় হয়েছে!',
    timesUp: 'সময় হয়েছে!',
    defaultIntervalAlarmTitle: 'অ্যালার্ম',
    intervalCascadeSub: (mins: number) =>
      `${formatNumberLocalized(mins, 'bn')} মিনিট পরপর অ্যালার্ম`,
    escalatingCascadeSub: 'ধাপে ধাপে ঘন অ্যালার্ম',
    snoozeBtn: (mins: number) => `${formatNumberLocalized(mins, 'bn')} মিঃ পর (Snooze)`,
    dismissAlarmBtn: 'বন্ধ করুন',

    // Power Nap Preset Modal
    powerNapPresetTitle: 'পাওয়ার ন্যাপের সময়',
    powerNapPresetDesc:
      'পাওয়ার ন্যাপের সময় বেছে নিন। হোম স্ক্রিনের ন্যাপ বাটনে ট্যাপ করলেই টাইমার শুরু হবে, আর ধরে রাখলে সময় বদলানো যাবে।',
    quickPresetsLabel: 'সময় বেছে নিন',
    customDurationLabel: 'নিজের মতো সময় দিন (মিনিট)',
    savePresetBtn: 'সেভ করুন',
    startNapNowBtn: (mins: number) =>
      `এখনই ${formatNumberLocalized(mins, 'bn')} মিঃ ন্যাপ নিন`,

    // Settings Modal
    sectionAppearance: 'থিম ও ভাষা',
    themeLabel: 'থিম',
    themeDark: 'ডার্ক',
    themeLight: 'লাইট',
    languageLabel: 'ভাষা',
    langEnglish: 'English',
    langBangla: 'বাংলা',

    sectionAlarmType: 'অ্যালার্ম বাজার ধরন',
    intervalAlarmTypeLabel: 'অ্যালার্মের বিরতির ধরন',
    selectAlarmTypeModalTitle: 'অ্যালার্ম বাজার ধরন বেছে নিন',
    selectAlarmTypeModalDesc:
      'সময়সীমা এবং আগে/পরে মোডে অ্যালার্মগুলো কতক্ষণ পরপর বাজবে তা বেছে নিন।',
    typeStandardTitle: 'নির্দিষ্ট বিরতি (সাধারণ)',
    typeStandardShort: 'সাধারণ',
    typeStandardDesc:
      'আপনার দেওয়া নির্দিষ্ট মিনিট পরপর এবং নির্দিষ্ট সংখ্যক বার অ্যালার্ম বাজবে।',
    typeEscalatingTitle: 'ধাপে ধাপে ঘন অ্যালার্ম',
    typeEscalatingShort: 'ধাপে ধাপে ঘন',
    typeEscalatingDesc:
      'সময় যত কাছে আসবে, অ্যালার্ম নিজে থেকেই তত ঘন ঘন বাজবে (১৫মি → ১০মি → ৫মি → ৩মি → ২মি → ১মি)।',

    sectionDefaults: 'ডিফল্ট সময়',
    defaultIntervalLabel: 'ডিফল্ট বিরতি',
    defaultStepsLabel: 'ডিফল্ট অ্যালার্ম সংখ্যা',
    defaultWindowDurationLabel: 'ডিফল্ট সময়সীমা',
    defaultDirectionLabel: 'ডিফল্ট দিক (আগে/পরে)',
    defaultSnoozeLabel: 'ডিফল্ট স্নুজ সময়',
    defaultPowerNapLabel: 'ডিফল্ট পাওয়ার ন্যাপ',

    sectionFeatures: 'সুবিধাসমূহ',
    toggleSequenceTitle: 'অ্যালার্মের তালিকা দেখান',
    toggleSequenceDesc:
      'অ্যালার্ম এডিট করার সময় প্রতিটি ধাপের সময় আলাদাভাবে দেখার ও বন্ধ করার অপশন রাখুন।',
    toggleCreationControlsTitle: 'তৈরির সময় বাড়তি অপশন দেখান',
    toggleCreationControlsDesc:
      'নতুন অ্যালার্ম তৈরির সময় বিরতি ও সংখ্যা পরিবর্তনের অপশন সরাসরি দেখান।',
    toggleKeypadInputTitle: 'কিপ্যাডে সময় লেখা',
    toggleKeypadInputDesc: 'নাম্বার কিপ্যাড দিয়ে সময় লেখার অপশন রাখুন।',
    togglePowerNapTitle: 'পাওয়ার ন্যাপ বাটন দেখান',
    togglePowerNapDesc: 'হোম স্ক্রিনে নিচে পাওয়ার ন্যাপ বাটনটি রাখুন।',
    toggleToastsTitle: 'নিশ্চিতকরণ মেসেজ দেখান',
    toggleToastsTitleShort: 'নিশ্চিতকরণ মেসেজ',
    toggleToastsDesc: 'অ্যালার্ম সেভ বা চালু করলে কতক্ষণ পর বাজবে তার মেসেজ দেখান।',
    resetSettingsBtn: 'ডিফল্ট সেটিংসে ফিরিয়ে নিন',
    resetSettingsConfirmTitle: 'ডিফল্ট সেটিংসে ফিরিয়ে নেবেন?',
    resetSettingsConfirmBody:
      'এতে আপনার থিম, ডিফল্ট সময় এবং কাস্টম ক্যাটাগরিগুলো আগের অবস্থায় ফিরে যাবে। আপনার সেভ করা অ্যালার্মগুলো মুছে যাবে না।',
    resetSettingsToast: 'ডিফল্ট সেটিংস ফিরিয়ে আনা হয়েছে',
    viewSourceCodeBtn: 'সোর্স কোড দেখুন',
    checkForUpdatesBtn: 'আপডেট চেক করুন',
    checkingUpdatesBtn: 'আপডেট খোঁজা হচ্ছে...',
    updateLatestToast: 'আপনি সর্বশেষ ভার্সনে আছেন (v1.0.0)',
    updateLatestWithTimeToast: (version: string, dateStr: string) =>
      `সর্বশেষ ভার্সন (v${formatNumberLocalized(version, 'bn')}) • আপডেট: ${dateStr}`,
    updateDownloadingToast: 'নতুন আপডেট পাওয়া গেছে! ডাউনলোড হচ্ছে...',
    updateApplyingToast: 'নতুন আপডেট ইনস্টল হচ্ছে...',
    updateAppliedToast: (version: string) =>
      `সর্বশেষ v${formatNumberLocalized(version, 'bn')}-এ আপডেট হয়েছে`,
    updateCardSubtitle: (version: string, dateStr: string) =>
      `সর্বশেষ v${formatNumberLocalized(version, 'bn')} • আপডেট: ${dateStr}`,
    lastUpdatedBadge: (dateStr: string) => `সর্বশেষ আপডেট: ${dateStr}`,
    whatsNewModalTitle: (version: string) =>
      `নতুন কী আছে — v${formatNumberLocalized(version, 'bn')}`,
    updateDevModeToast: 'v1.0.0 • রিলিজ/APK বিল্ডে অটো-আপডেট কাজ করে',
    updateErrorToast: 'এই মুহূর্তে আপডেট চেক করা যায়নি',
    changelogBtn: 'চেঞ্জলগ (v1.0.0)',
    changelogModalTitle: 'রিলিজ নোটস — v1.0.0',
    changelogModalSub: 'অ্যালার্মিং অ্যাপের প্রথম রিলিজ (v1.0.0)-এর সকল সুবিধাসমূহ।',
    changelogSectionsV100: [
      {
        title: 'অ্যালার্ম ইঞ্জিন ও মোড',
        items: [
          'একবার (Single), সময়সীমা (Window) এবং আগে/পরে (Before/After) অ্যালার্ম মোড।',
          'সাধারণ নির্দিষ্ট বিরতি এবং ধাপে ধাপে ঘন (Escalating: ১৫মি → ১০মি → ৫মি → ৩মি → ২মি → ১মি) অ্যালার্ম।',
          'প্রতিটি ধাপের সময় আলাদাভাবে পরিবর্তন বা বন্ধ করার সুবিধা।',
        ],
      },
      {
        title: 'ক্যাটাগরি ও স্মার্ট শিডিউল',
        items: [
          'কাস্টম ক্যাটাগরি ট্যাগ এবং রাত ১২:০০টা পর্যন্ত আজকের জন্য বা আগামীকালের জন্য সব অ্যালার্ম বন্ধ করার সুবিধা।',
          'ক্যাটাগরি অনুযায়ী "ঘুম ভেঙে গেছে?" কার্ড এবং পরের বার স্কিপ করার অপশন।',
          'কাস্টম সময়সহ দ্রুত পাওয়ার ন্যাপ টাইমার।',
        ],
      },
      {
        title: 'ডিজাইন, রেসপনসিভনেস ও আপডেট',
        items: [
          '৭২০পি ছোট স্ক্রিন, সাধারণ ফোন এবং ট্যাবলেটের জন্য রেসপনসিভ লেআউট ও নেভিগেশন বার সেফ এরিয়া।',
          'মার্জিত কন্টেইনার কর্নার, কন্টেইনার ছাড়া পরিষ্কার রিংয়িং ঘড়ি, পুরো কার্ড জুড়ে ট্যাপ এরিয়া এবং স্মার্ট ঘড়ির ডায়াল (ড্র্যাগ ও ট্যাপ সুবিধা এবং স্ক্রল সুরক্ষা)।',
          'এজ-টু-এজ ফুল-ব্লিড ঘড়ি আইকন এবং হালকা (~১৫ মেগাবাইট) প্রোডাকশন এপিকে বিল্ড।',
          'অ্যাপের ভেতর থেকেই অটো-আপডেট (ছোট আপডেটে টোস্ট মেসেজ এবং বড় ভার্সন আপডেটে চেঞ্জলগ পপআপ) ও সর্বশেষ আপডেটের সময় দেখার সুবিধা।',
        ],
      },
    ],

    // Settings ? Tooltips
    tooltipTheme: 'ডার্ক মোড (রাতের জন্য আরামদায়ক) এবং লাইট মোডের মধ্যে পরিবর্তন করুন।',
    tooltipLanguage: 'অ্যাপের ভাষা ইংরেজি বা বাংলায় পরিবর্তন করুন।',
    tooltipSafetyCheck:
      'অ্যালার্ম ঠিকমতো বাজার জন্য প্রয়োজনীয় পারমিশন চালু আছে কি না তা সেটিংস আইকনের পাশে দেখাবে।',
    tooltipVolumeButtons:
      'অ্যালার্ম বাজার সময় ফোনের ভলিউম বাটন চাপলে কী হবে তা ঠিক করুন।',
    tooltipEarlyDismiss:
      'অ্যালার্ম বাজার আগে ঘুম ভেঙে গেলে আজকের মতো অ্যালার্মটি বন্ধ করার কার্ড দেখাবে।',
    tooltipCategories:
      'অ্যালার্মগুলো আলাদা ক্যাটাগরিতে সাজাতে নতুন নাম যোগ বা বাদ দিন।',
    tooltipAlarmType:
      'নির্দিষ্ট মিনিট পরপর বাজবে নাকি সময়ের সাথে ঘন ঘন বাজবে তা বেছে নিন।',
    tooltipDefaultSnooze: 'স্নুজ বাটনে ট্যাপ করলে কত মিনিট পর আবার অ্যালার্ম বাজবে।',
    tooltipDefaultInterval: 'একটি অ্যালার্ম থেকে পরের অ্যালার্মের মাঝখানের ডিফল্ট বিরতি।',
    tooltipDefaultSteps: 'আগে/পরে মোডে ডিফল্ট কয়টি অ্যালার্ম তৈরি হবে।',
    tooltipDefaultWindow: 'সময়সীমা মোডে শুরু ও শেষ সময়ের মাঝখানের ডিফল্ট ব্যবধান।',
    tooltipDefaultDirection: 'মূল সময়ের আগে নাকি পরে অ্যালার্মগুলো বাজবে।',
    tooltipDefaultPowerNap: 'হোম স্ক্রিনের পাওয়ার ন্যাপ বাটনে ট্যাপ করলে ডিফল্ট কত মিনিটের ন্যাপ শুরু হবে।',
    tooltipShowSequence:
      'অ্যালার্ম এডিট করার সময় ভেতরের সবগুলো অ্যালার্মের তালিকা দেখাবে।',
    tooltipShowAdvanced:
      'নতুন অ্যালার্ম সেট করার স্ক্রিনেই বিরতি ও সংখ্যা পরিবর্তনের অপশন দেখাবে।',
    tooltipKeypadInput:
      'অ্যালার্মের সময় সেট করার সময় নাম্বার কিপ্যাড দিয়ে সরাসরি ঘণ্টা ও মিনিট লেখার বাটন দেখাবে।',
    tooltipShowPowerNap: 'হোম স্ক্রিনে পাওয়ার ন্যাপ বাটনটি দেখাবে বা লুকিয়ে রাখবে।',
    tooltipShowToasts: 'অ্যালার্ম চালু বা সেভ করলে নিচে নিশ্চিতকরণ মেসেজ দেখাবে।',

    // Header Safety Status Icon Messages
    noUpcomingAlarms: 'কোনো অ্যালার্ম চালু নেই',
    nextAlarmPrefix: 'পরেরটা',
    nextAlarmHeaderBadge: (countdown: string, timeStr: string) =>
      `পরেরটা: ${countdown} • ${timeStr}`,
    allSystemsGo: 'সব কিছু ঠিকমতো সেটআপ করা আছে! অ্যালার্ম সময়মতো বাজবে।',
    safetyAllSystemsGo: 'সব কিছু ঠিকমতো সেটআপ করা আছে! অ্যালার্ম সময়মতো বাজবে।',
    safetyPermissionsNeeded: 'অ্যালার্ম ঠিকমতো বাজতে নোটিফিকেশন পারমিশন দিন।',
    safetyBatteryLowPrefix: 'ব্যাটারি কম',
    safetyBatteryLowSuffix: '। সময়মতো অ্যালার্ম বাজতে চার্জে দিন।',
    safetyVolumeLow: 'অ্যালার্মের সাউন্ড কম। শব্দ বাড়িয়ে নিন।',
    safetyNotificationsBlocked: 'নোটিফিকেশন বন্ধ আছে। চালু করতে ট্যাপ করুন।',
    batteryLowWarn: (pct: number) =>
      `ফোনের চার্জ কম (${formatNumberLocalized(pct, 'bn')}%)। চার্জে লাগান।`,
    volumeLowWarn: (pct: number) =>
      `অ্যালার্মের সাউন্ড কম (${formatNumberLocalized(pct, 'bn')}%)। শব্দ বাড়িয়ে নিন।`,
    notificationsBlockedWarn: 'নোটিফিকেশন বন্ধ আছে। চালু করতে ট্যাপ করুন।',

    // Early Dismissal ("I'm Already Awake")
    earlyDismissTitle: (label: string, mins: number) =>
      `আর ${formatNumberLocalized(mins, 'bn')} মিনিট পর ${label || 'অ্যালার্ম'} বাজবে`,
    earlyDismissAction: 'ঘুম ভেঙে গেছে (আজকের মতো বন্ধ করুন)',
    earlyDismissBannerTitle: (label: string, mins: number) =>
      `আর ${formatNumberLocalized(mins, 'bn')} মিনিট পর ${label || 'অ্যালার্ম'} — ঘুম ভেঙে গেছে?`,
    earlyDismissBannerSub: 'ট্যাপ করলে শুধু আজকের মতো বন্ধ হবে, পরের দিন যথানিয়মে বাজবে',
    earlyDismissConfirmToast: 'আজকের অ্যালার্মটি বন্ধ করা হয়েছে',

    // Skip Next Occurrence
    skipNextBtn: 'পরের বার বাজবে না',
    resumeNextBtn: 'যথানিয়মে চালু রাখুন',
    skippingNextPrefix: 'পরের বার বন্ধ:',
    resumedScheduleToast: 'অ্যালার্ম আবার আগের নিয়মে চালু হয়েছে',
    skippingNextBadge: (dateLabel: string) => `পরের বার বন্ধ: ${dateLabel}`,
    pausedFor24hBadge: '২৪ ঘণ্টার জন্য বন্ধ',

    // Categories & Smart Day-Boundary Group Pause
    categoryLabel: 'ক্যাটাগরি',
    categoryAll: 'সবগুলো',
    categoryNone: 'কিছু না',
    groupToggleBtnOn: (cat: string) => `সব ${cat} অ্যালার্ম চালু করুন`,
    groupToggleBtnOff: (cat: string) => `সব ${cat} অ্যালার্ম আজকের জন্য বন্ধ করুন`,
    groupToggleActionOn: (cat: string) => `সব ${cat} অ্যালার্ম চালু করুন`,
    groupToggleActionOff: (cat: string) => `সব ${cat} অ্যালার্ম আজকের জন্য বন্ধ করুন`,
    groupToggleActionOffToday: (cat: string) => `সব ${cat} অ্যালার্ম আজকের জন্য বন্ধ করুন`,
    groupToggleActionOffTomorrow: (cat: string) =>
      `সব ${cat} অ্যালার্ম আগামীকালের জন্য বন্ধ করুন`,
    groupToggleSubHintToday: 'রাত ১২:০০টা পর্যন্ত',
    groupToggleSubHintTomorrow: 'আগামীকাল সারাদিন',
    groupToggleSubHintResume: 'এখনই চালু করুন',
    groupPauseModeTodayTitle: 'আজকের বাকি সময় (রাত ১২:০০টা পর্যন্ত)',
    groupPauseModeTodayDesc:
      'আজকের বাকি অ্যালার্মগুলো বন্ধ থাকবে, আগামীকাল সকাল থেকে যথাসময়ে বাজবে।',
    groupPauseModeTomorrowTitle: 'আগামীকাল সারাদিন (পরশু রাত ১২:০০টা পর্যন্ত)',
    groupPauseModeTomorrowDesc:
      'আজকের বাকি সময় এবং আগামীকাল সারাদিন এই ক্যাটাগরির অ্যালার্ম বন্ধ থাকবে।',
    groupToggleConfirmTitle: (cat: string, enable: boolean) =>
      enable ? `সব ${cat} অ্যালার্ম চালু করবেন?` : `সব ${cat} অ্যালার্ম সাময়িক বন্ধ করবেন?`,
    groupToggleModalTitle: (cat: string, enable: boolean) =>
      enable ? `সব ${cat} অ্যালার্ম চালু করবেন?` : `সব ${cat} অ্যালার্ম সাময়িক বন্ধ করবেন?`,
    groupToggleConfirmDesc: (cat: string, count: number, enable: boolean) =>
      enable
        ? `এতে ${cat} ক্যাটাগরির সবগুলো (${formatNumberLocalized(count, 'bn')}টি) অ্যালার্ম এখনই চালু হয়ে যাবে।`
        : `${cat} ক্যাটাগরির ${formatNumberLocalized(
            count,
            'bn'
          )}টি অ্যালার্ম কতক্ষণের জন্য বন্ধ রাখতে চান বেছে নিন। রাত ১২:০০টায় নিজে থেকেই আবার চালু হবে।`,
    groupToggleModalBody: (cat: string, count: number, enable: boolean) =>
      enable
        ? `এতে ${cat} ক্যাটাগরির সবগুলো (${formatNumberLocalized(count, 'bn')}টি) অ্যালার্ম এখনই চালু হয়ে যাবে।`
        : `${cat} ক্যাটাগরির ${formatNumberLocalized(
            count,
            'bn'
          )}টি অ্যালার্ম কতক্ষণের জন্য বন্ধ রাখতে চান বেছে নিন। রাত ১২:০০টায় নিজে থেকেই আবার চালু হবে।`,
    cancelBtn: 'বাতিল',
    confirmBtn: 'হ্যাঁ, করুন',
    confirmActionBtn: 'হ্যাঁ, করুন',

    // Hardware Volume Buttons & Safety Settings
    sectionHardware: 'নিরাপত্তা ও কন্ট্রোল',
    sectionSafetyAndHardware: 'নিরাপত্তা ও কন্ট্রোল',
    volumeButtonsLabel: 'ভলিউম বাটন',
    volumeButtonActionLabel: 'ভলিউম বাটনের কাজ (বাজার সময়)',
    volumeButtonActionDesc: 'অ্যালার্ম বাজার সময় ফোনের ভলিউম বাটন চাপলে কী হবে তা ঠিক করুন।',
    volumeActionSnooze: 'স্নুজ হবে',
    volumeActionDismiss: 'বন্ধ হবে',
    volumeActionNone: 'কিছু হবে না',
    volumeRingingHintSnooze: 'ভলিউম বাটন চাপলে স্নুজ হবে',
    volumeRingingHintDismiss: 'ভলিউম বাটন চাপলে অ্যালার্ম বন্ধ হবে',
    earlyDismissWindowLabel: 'আগাম বন্ধ করার সময়সীমা',
    earlyDismissWindowDesc:
      'অ্যালার্ম বাজার কতক্ষণ আগে থেকে "ঘুম ভেঙে গেছে?" কার্ডটি দেখাবে।',
    safetyCheckToggleTitle: 'পারমিশন ও সিস্টেম চেক',
    safetyCheckToggleDesc: 'সেটিংস আইকনের পাশে পারমিশন স্ট্যাটাস আইকন দেখাবে।',
    toggleSafetyCheckTitle: 'পারমিশন ও সিস্টেম চেক',
    toggleSafetyCheckDesc: 'সেটিংস আইকনের পাশে পারমিশন স্ট্যাটাস আইকন দেখাবে।',

    // Duplicate, Swipe & Undo
    duplicateAlarmBtn: 'কপি করুন',
    copySuffix: '(কপি)',
    editAction: 'এডিট',
    deleteAction: 'মুছে ফেলুন',
    swipeEditBtn: 'এডিট',
    swipeDeleteBtn: 'মুছুন',
    alarmDeletedToast: 'অ্যালার্ম মুছে ফেলা হয়েছে',
    alarmRestoredToast: 'অ্যালার্ম ফিরিয়ে আনা হয়েছে',
    alarmDuplicatedToast: 'আরেকটি কপি তৈরি হয়েছে',
    undoBtn: 'ফিরিয়ে আনুন',
    cardActionsTitle: 'অ্যালার্মের অপশন',

    // Categories Management in Settings
    sectionCategories: 'ক্যাটাগরি',
    categoriesManageLabel: 'অ্যালার্ম ক্যাটাগরি',
    manageCategoriesDesc: 'অ্যালার্মগুলো আলাদা করে রাখতে ক্যাটাগরি যোগ বা বাদ দিন।',
    newCategoryPlaceholder: 'নতুন ক্যাটাগরির নাম...',
    addCategoryPlaceholder: 'নতুন ক্যাটাগরির নাম...',
    addCategoryBtn: 'যোগ করুন',
  },
} as const;

export function useTranslation() {
  const language = useSettingsStore((state) => state.language);
  const t = TRANSLATIONS[language];
  return {
    t,
    language,
    formatNum: (val: number | string) => formatNumberLocalized(val, language),
    formatTime12h: (hour: number, minute: number) =>
      formatTime12hLocalized(hour, minute, language),
  };
}
