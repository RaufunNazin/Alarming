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

export const TRANSLATIONS = {
  en: {
    // Header & Home
    appTitle: 'Alarms',
    settingsTitle: 'Settings',
    noAlarmsTitle: 'No Alarms Set',
    noAlarmsSub: 'Tap + to add your first alarm',
    powerNapLabel: 'Power Nap',
    powerNapButtonShort: (mins: number) => `${mins}m Nap`,
    powerNapHint: 'Long press for preset',

    // Periods & Days
    am: 'AM',
    pm: 'PM',
    everyday: 'Everyday',
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
    alarmsActiveOfTotal: (active: number, total: number) => `${active} of ${total} alarms`,
    alarmsCountSummary: (count: number) => `${count} ${count === 1 ? 'alarm' : 'alarms'}`,

    // Creation & Edit Modals
    newAlarmTitle: 'New Alarm',
    editAlarmTitle: 'Edit Alarm',
    cancel: 'Cancel',
    save: 'Save',
    saveChanges: 'Save Changes',
    delete: 'Delete',
    done: 'Done',
    alarmLabelPlaceholder: 'Alarm Label (Optional)',

    // Modes
    modeSingle: 'Single',
    modeWindow: 'Window',
    modeOffset: 'Before / After',
    startTime: 'Start Time',
    endTime: 'End Time',
    alarmTime: 'Alarm Time',
    targetTime: 'Target Time',
    intervalLabel: 'Interval',
    everyNMin: (mins: number) => `Every ${mins} min`,
    nMin: (mins: number) => `${mins} min`,
    directionLabel: 'Direction',
    before: 'Before',
    after: 'After',
    alarmsCountLabel: 'Alarms',
    repeatDaysLabel: 'Repeat Days',
    repeatLabel: 'Repeat',

    // Escalating Info Banner
    escalatingModeActiveTitle: 'Escalating Interval Active',
    escalatingModeDesc: 'Automatic tightening intervals: 15m → 10m → 5m → 3m → 2m → 1m',
    escalatingWindowDesc: 'Intervals automatically shrink as End Time approaches (20m → 15m → 10m → 5m → 3m → 2m → 1m)',
    generatesNAlarms: (count: number) => `Generates ${count} ${count === 1 ? 'alarm' : 'alarms'}`,

    // Granular Sequence Section
    alarmSequenceTitle: (count: number) => `Alarm Sequence (${count})`,
    alarmSequencePartialTitle: (enabled: number, total: number) =>
      `Alarm Sequence (${enabled}/${total} active)`,
    alarmSequenceHint:
      'Tap any time to adjust it individually, or toggle specific alarms on/off.',
    resetCustomTimings: 'Reset Custom Timings',
    stepStart: 'Start',
    stepEnd: 'End',
    stepTarget: 'Target',
    stepN: (n: number) => `Step ${n}`,
    adjustStepN: (n: number) => `Adjust Step ${n}`,

    // Clock & Keypad Input
    ringsInShort: 'Rings in',
    selectTime: 'Select Time',
    typeInTime: 'Type in time',
    hourLabel: 'Hour',
    minuteLabel: 'Minute',
    useKeyboardTooltip: 'Type time with number keypad',
    useDialTooltip: 'Select time on clock dial',

    // Ringing Overlay
    ringingNow: 'RINGING NOW',
    defaultIntervalAlarmTitle: 'Interval Alarm',
    intervalCascadeSub: (mins: number) => `Interval Cascade (${mins}m)`,
    escalatingCascadeSub: 'Escalating Cascade',
    snoozeBtn: (mins: number) => `Snooze (${mins} min)`,
    dismissAlarmBtn: 'Dismiss Alarm',

    // Power Nap Preset Modal
    powerNapPresetTitle: 'Power Nap Preset',
    powerNapPresetDesc:
      'Choose your default power nap duration. Single-tap the Power Nap button on the home screen to start immediately, or long-press anytime to change.',
    quickPresetsLabel: 'Quick Presets',
    customDurationLabel: 'Custom Duration (minutes)',
    savePresetBtn: 'Save Preset',
    startNapNowBtn: (mins: number) => `Start ${mins}m Nap Now`,

    // Settings Modal
    sectionAppearance: 'Appearance & Language',
    themeLabel: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    languageLabel: 'Language',
    langEnglish: 'English',
    langBangla: 'বাংলা',

    sectionAlarmType: 'Interval Alarm System',
    intervalAlarmTypeLabel: 'Interval Alarm Type',
    selectAlarmTypeModalTitle: 'Select Interval Alarm Type',
    selectAlarmTypeModalDesc:
      'Choose how Window and Before/After interval alarms calculate their intermediate alarm timings.',
    typeStandardTitle: 'Standard Interval & Steps',
    typeStandardShort: 'Standard',
    typeStandardDesc:
      'Manually configure fixed interval minutes and number of alarm steps for Window and Before/After alarms.',
    typeEscalatingTitle: 'Escalating Interval Alarm',
    typeEscalatingShort: 'Escalating',
    typeEscalatingDesc:
      'Replaces manual interval and step controls with automatic progressively faster intervals (15m → 10m → 5m → 3m → 2m → 1m) for both Window and Before/After alarms.',

    sectionDefaults: 'Default Times & Steps',
    defaultIntervalLabel: 'Default Interval',
    defaultStepsLabel: 'Default Steps (Before/After)',
    defaultWindowDurationLabel: 'Default Window Span',
    defaultDirectionLabel: 'Default Direction',
    defaultSnoozeLabel: 'Default Snooze Time',
    defaultPowerNapLabel: 'Default Power Nap',

    sectionFeatures: 'Feature Toggles & Simplicity',
    toggleSequenceTitle: 'Show Alarm Sequence Section',
    toggleSequenceDesc:
      'Show the expandable individual alarm timing list inside the Edit Alarm modal',
    toggleCreationControlsTitle: 'Show Advanced Creation Controls',
    toggleCreationControlsDesc:
      'Show interval, step count, and direction controls when creating an alarm (uses defaults when hidden)',
    toggleKeypadInputTitle: 'Number Keypad Time Input',
    toggleKeypadInputDesc:
      'Show the keyboard icon on the clock picker to type alarm times using the number keypad',
    togglePowerNapTitle: 'Show Power Nap Button',
    togglePowerNapDesc: 'Show the floating Power Nap button on the main screen',
    toggleToastsTitle: 'Show Confirmation Toasts',
    toggleToastsDesc: 'Show "Alarm set for..." confirmation banner when saving or toggling alarms',
    resetSettingsBtn: 'Reset Settings to Default',

    // 1a. Live Countdown & Header Sleep Window
    noUpcomingAlarms: 'No upcoming alarms',
    nextAlarmPrefix: 'Next',
    nextAlarmHeaderBadge: (countdown: string, timeStr: string) =>
      `Next: ${countdown} • ${timeStr}`,

    // 1b. Pre-Sleep Safety Check
    allSystemsGo: 'All Systems Go • Ready for sleep',
    safetyAllSystemsGo: 'All Systems Go • Ready for sleep',
    safetyBatteryLowPrefix: 'Battery low',
    safetyBatteryLowSuffix: '. Plug in charger to ensure alarms ring',
    safetyVolumeLow: 'Alarm volume low. Increase volume so alarms are audible',
    safetyNotificationsBlocked: 'Notifications blocked. Tap to enable alarm alerts',
    batteryLowWarn: (pct: number) =>
      `Battery low (${pct}%). Plug in charger to ensure alarms ring`,
    volumeLowWarn: (pct: number) =>
      `Alarm volume low (${pct}%). Increase volume so alarms are audible`,
    notificationsBlockedWarn:
      'Notifications blocked. Tap to enable alarm alerts',

    // 2a. Early Dismissal ("I'm Already Awake")
    earlyDismissTitle: (label: string, mins: number) =>
      `${label || 'Alarm'} in ${mins} min`,
    earlyDismissAction: "I'm already awake (Dismiss today)",
    earlyDismissBannerTitle: (label: string, mins: number) =>
      `${label || 'Alarm'} in ${mins} min — I'm already awake`,
    earlyDismissBannerSub: 'Tap to dismiss today without disabling repeat schedule',
    earlyDismissConfirmToast: "Dismissed today's upcoming alarm",

    // 2b. Skip Next Occurrence
    skipNextBtn: 'Skip Next',
    resumeNextBtn: 'Resume Next',
    skippingNextPrefix: 'Skipping next:',
    resumedScheduleToast: 'Resumed normal alarm schedule',
    skippingNextBadge: (dateLabel: string) => `Skipping next: ${dateLabel}`,

    // 2c. Categories & Group Toggles
    categoryLabel: 'Category',
    categoryAll: 'All',
    categoryNone: 'None',
    groupToggleBtnOn: (cat: string) => `Enable all ${cat}`,
    groupToggleBtnOff: (cat: string) => `Turn off all ${cat}`,
    groupToggleActionOn: (cat: string) => `Enable all ${cat}`,
    groupToggleActionOff: (cat: string) => `Turn off all ${cat}`,
    groupToggleConfirmTitle: (cat: string, enable: boolean) =>
      `${enable ? 'Enable' : 'Turn Off'} All ${cat} Alarms?`,
    groupToggleModalTitle: (cat: string, enable: boolean) =>
      `${enable ? 'Enable' : 'Turn Off'} All ${cat} Alarms?`,
    groupToggleConfirmDesc: (cat: string, count: number, enable: boolean) =>
      `This will ${enable ? 'turn on' : 'turn off'} all ${count} ${cat} ${
        count === 1 ? 'alarm' : 'alarms'
      } at once.`,
    groupToggleModalBody: (cat: string, count: number, enable: boolean) =>
      `This will ${enable ? 'turn on' : 'turn off'} all ${count} ${cat} ${
        count === 1 ? 'alarm' : 'alarms'
      } at once.`,
    cancelBtn: 'Cancel',
    confirmBtn: 'Confirm',
    confirmActionBtn: 'Confirm',

    // 3b. Hardware Volume Buttons & Safety Settings
    sectionHardware: 'Hardware & Sleep Controls',
    sectionSafetyAndHardware: 'Safety, Sleep & Hardware Buttons',
    volumeButtonsLabel: 'Volume Buttons (While Ringing)',
    volumeButtonActionLabel: 'Hardware Volume Buttons',
    volumeButtonActionDesc:
      'Choose what happens when you press physical Volume Up/Down while an alarm is ringing',
    volumeActionSnooze: 'Snooze',
    volumeActionDismiss: 'Dismiss',
    volumeActionNone: 'Do Nothing',
    volumeRingingHintSnooze: 'Press Volume button to Snooze',
    volumeRingingHintDismiss: 'Press Volume button to Dismiss',
    earlyDismissWindowLabel: "Early Dismissal ('I'm Awake') Window",
    earlyDismissWindowDesc:
      "Show the 'I'm already awake' card when an active alarm is within this window",
    safetyCheckToggleTitle: 'Pre-Sleep Safety & Battery Check',
    safetyCheckToggleDesc:
      'Show status check for low battery (<20%), low alarm volume, and permissions',
    toggleSafetyCheckTitle: 'Pre-Sleep Safety & Battery Check',
    toggleSafetyCheckDesc:
      'Warn on the main screen if battery is <20%, alarm volume is <30%, or notifications are blocked',

    // 6a & 8. Duplicate, Swipe & Undo
    duplicateAlarmBtn: 'Duplicate Alarm',
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
    sectionCategories: 'Categories Management',
    manageCategoriesDesc:
      'Create or remove custom category tags to filter and group-toggle your alarms.',
    newCategoryPlaceholder: 'New category name...',
    addCategoryPlaceholder: 'New category name...',
    addCategoryBtn: 'Add',
  },
  bn: {
    // Header & Home
    appTitle: 'অ্যালার্ম',
    settingsTitle: 'সেটিংস',
    noAlarmsTitle: 'কোনো অ্যালার্ম নেই',
    noAlarmsSub: 'নতুন অ্যালার্ম যোগ করতে + বাটনে ট্যাপ করুন',
    powerNapLabel: 'পাওয়ার ন্যাপ',
    powerNapButtonShort: (mins: number) => `${formatNumberLocalized(mins, 'bn')} মিঃ ন্যাপ`,
    powerNapHint: 'সময় বদলাতে চাপ দিয়ে ধরে রাখুন',

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
    save: 'সেভ করুন',
    saveChanges: 'সেভ করুন',
    delete: 'মুছে ফেলুন',
    done: 'ঠিক আছে',
    alarmLabelPlaceholder: 'অ্যালার্মের নাম (ঐচ্ছিক)',

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
    escalatingModeDesc: 'সময়ের সাথে অ্যালার্মের বিরতি নিজে থেকেই কমতে থাকবে: ১৫মি → ১০মি → ৫মি → ৩মি → ২মি → ১মি',
    escalatingWindowDesc:
      'শেষের সময় যত কাছে আসবে, অ্যালার্ম তত ঘন ঘন বাজবে (২০মি → ১৫মি → ১০মি → ৫মি → ৩মি → ২মি → ১মি)',
    generatesNAlarms: (count: number) => `মোট ${formatNumberLocalized(count, 'bn')}বার বাজবে`,

    // Granular Sequence Section
    alarmSequenceTitle: (count: number) => `অ্যালার্মের তালিকা (${formatNumberLocalized(count, 'bn')}টি)`,
    alarmSequencePartialTitle: (enabled: number, total: number) =>
      `অ্যালার্মের তালিকা (${formatNumberLocalized(total, 'bn')}টির মধ্যে ${formatNumberLocalized(enabled, 'bn')}টি চালু)`,
    alarmSequenceHint:
      'যেকোনো সময়ের ওপর ট্যাপ করে টাইম বদলান, অথবা পাশের সুইচ দিয়ে নির্দিষ্ট অ্যালার্ম চালু বা বন্ধ করুন।',
    resetCustomTimings: 'আগের সময়ে ফিরিয়ে নিন',
    stepStart: 'শুরু',
    stepEnd: 'শেষ',
    stepTarget: 'মূল সময়',
    stepN: (n: number) => `${formatNumberLocalized(n, 'bn')} নং ধাপ`,
    adjustStepN: (n: number) => `${formatNumberLocalized(n, 'bn')} নং অ্যালার্মের সময়`,

    // Clock & Keypad Input
    ringsInShort: 'বাজবে',
    selectTime: 'সময় ঠিক করুন',
    typeInTime: 'সময় লিখে দিন',
    hourLabel: 'ঘণ্টা',
    minuteLabel: 'মিনিট',
    useKeyboardTooltip: 'কিপ্যাডে সময় লিখুন',
    useDialTooltip: 'ঘড়ির কাঁটা ঘুরিয়ে সময় নিন',

    // Ringing Overlay
    ringingNow: 'অ্যালার্ম বাজছে',
    defaultIntervalAlarmTitle: 'একটানা অ্যালার্ম',
    intervalCascadeSub: (mins: number) =>
      `${formatNumberLocalized(mins, 'bn')} মিনিট পরপর অ্যালার্ম`,
    escalatingCascadeSub: 'ধাপে ধাপে ঘন অ্যালার্ম',
    snoozeBtn: (mins: number) => `আরও ${formatNumberLocalized(mins, 'bn')} মিনিট পর (Snooze)`,
    dismissAlarmBtn: 'অ্যালার্ম বন্ধ করুন',

    // Power Nap Preset Modal
    powerNapPresetTitle: 'পাওয়ার ন্যাপের সময়',
    powerNapPresetDesc:
      'হোম স্ক্রিনের পাওয়ার ন্যাপ বাটনে ট্যাপ করলেই কত মিনিটের অ্যালার্ম সেট হবে তা এখান থেকে ঠিক করে রাখুন।',
    quickPresetsLabel: 'সহজ অপশন',
    customDurationLabel: 'নিজের মতো সময় দিন (মিনিট)',
    savePresetBtn: 'সেভ করুন',
    startNapNowBtn: (mins: number) =>
      `এখনই ${formatNumberLocalized(mins, 'bn')} মিনিটের ন্যাপ নিন`,

    // Settings Modal
    sectionAppearance: 'থিম ও ভাষা',
    themeLabel: 'থিম',
    themeDark: 'ডার্ক',
    themeLight: 'লাইট',
    languageLabel: 'ভাষা',
    langEnglish: 'English',
    langBangla: 'বাংলা',

    sectionAlarmType: 'অ্যালার্ম বাজার ধরন',
    intervalAlarmTypeLabel: 'অ্যালার্ম কীভাবে বাজবে',
    selectAlarmTypeModalTitle: 'অ্যালার্ম বাজার ধরন বেছে নিন',
    selectAlarmTypeModalDesc:
      'সময়সীমা এবং আগে/পরে মোডে অ্যালার্মগুলো কতক্ষণ পরপর বাজবে তা ঠিক করুন।',
    typeStandardTitle: 'নির্দিষ্ট বিরতিতে (সাধারণ)',
    typeStandardShort: 'সাধারণ',
    typeStandardDesc:
      'আপনার ঠিক করে দেওয়া নির্দিষ্ট মিনিট পরপর এবং নির্দিষ্ট সংখ্যক বার অ্যালার্ম বাজবে।',
    typeEscalatingTitle: 'ধাপে ধাপে ঘন অ্যালার্ম',
    typeEscalatingShort: 'ধাপে ধাপে ঘন',
    typeEscalatingDesc:
      'আলাদা করে মিনিট বা সংখ্যা দিতে হবে না — সময় যত ঘনিয়ে আসবে, অ্যালার্ম নিজে থেকেই তত ঘন ঘন বাজতে থাকবে (১৫মি → ১০মি → ৫মি → ৩মি → ২মি → ১মি)।',

    sectionDefaults: 'ডিফল্ট সময় ও নিয়ম',
    defaultIntervalLabel: 'কতক্ষণ পরপর বাজবে',
    defaultStepsLabel: 'কয়বার বাজবে (আগে/পরে)',
    defaultWindowDurationLabel: 'শুরু ও শেষের ব্যবধান',
    defaultDirectionLabel: 'কখন বাজবে (আগে/পরে)',
    defaultSnoozeLabel: 'স্নুজ (Snooze) সময়',
    defaultPowerNapLabel: 'পাওয়ার ন্যাপের সময়',

    sectionFeatures: 'স্ক্রিন ও সুবিধাসমূহ',
    toggleSequenceTitle: 'সবগুলো অ্যালার্মের তালিকা দেখান',
    toggleSequenceDesc:
      'অ্যালার্ম এডিট করার সময় ভেতরের প্রতিটি ধাপের সময় আলাদাভাবে দেখার ও বন্ধ করার অপশন রাখুন',
    toggleCreationControlsTitle: 'তৈরির সময় বিস্তারিত অপশন দেখান',
    toggleCreationControlsDesc:
      'নতুন অ্যালার্ম সেট করার সময় বিরতি ও ধাপের সংখ্যা সরাসরি দেখান (বন্ধ থাকলে ডিফল্ট নিয়ম কাজ করবে)',
    toggleKeypadInputTitle: 'কিপ্যাডে সময় লেখা',
    toggleKeypadInputDesc:
      'ঘড়ির স্ক্রিনে নাম্বার কিপ্যাড দিয়ে সময় লেখার অপশন রাখুন',
    togglePowerNapTitle: 'পাওয়ার ন্যাপ বাটন দেখান',
    togglePowerNapDesc: 'হোম স্ক্রিনে নিচে ছোট ঘুমের (Power Nap) বাটনটি রাখুন',
    toggleToastsTitle: 'অ্যালার্ম সেট হওয়ার মেসেজ দেখান',
    toggleToastsDesc: 'অ্যালার্ম চালু বা সেভ করলে কতক্ষণ পর বাজবে তার মেসেজ দেখান',
    resetSettingsBtn: 'সব সেটিংস আগের অবস্থায় ফিরিয়ে নিন',

    // 1a. Live Countdown & Header Sleep Window
    noUpcomingAlarms: 'কোনো অ্যালার্ম চালু নেই',
    nextAlarmPrefix: 'পরেরটা',
    nextAlarmHeaderBadge: (countdown: string, timeStr: string) =>
      `পরেরটা: ${countdown} • ${timeStr}`,

    // 1b. Pre-Sleep Safety Check
    allSystemsGo: 'সব ঠিক আছে • নিশ্চিন্তে ঘুমান',
    safetyAllSystemsGo: 'সব ঠিক আছে • নিশ্চিন্তে ঘুমান',
    safetyBatteryLowPrefix: 'ব্যাটারি কম',
    safetyBatteryLowSuffix: '। সময়মতো অ্যালার্ম বাজতে চার্জে দিন',
    safetyVolumeLow: 'অ্যালার্মের সাউন্ড কম। শব্দ বাড়িয়ে নিন',
    safetyNotificationsBlocked:
      'নোটিফিকেশন বন্ধ আছে। অ্যালার্ম বাজতে পারমিশন দিন',
    batteryLowWarn: (pct: number) =>
      `ফোনের চার্জ কম (${formatNumberLocalized(pct, 'bn')}%)। অ্যালার্ম মিস না করতে চার্জে লাগান`,
    volumeLowWarn: (pct: number) =>
      `অ্যালার্মের সাউন্ড কম (${formatNumberLocalized(pct, 'bn')}%)। শব্দ বাড়িয়ে নিন`,
    notificationsBlockedWarn:
      'নোটিফিকেশন বন্ধ আছে। অ্যালার্ম শুনতে এখানে ট্যাপ করে চালু করুন',

    // 2a. Early Dismissal ("I'm Already Awake")
    earlyDismissTitle: (label: string, mins: number) =>
      `আর ${formatNumberLocalized(mins, 'bn')} মিনিট পর ${label || 'অ্যালার্ম'} বাজবে`,
    earlyDismissAction: 'ঘুম ভেঙে গেছে (আজকের মতো বন্ধ করুন)',
    earlyDismissBannerTitle: (label: string, mins: number) =>
      `আর ${formatNumberLocalized(mins, 'bn')} মিনিট পর ${label || 'অ্যালার্ম'} — ঘুম ভেঙে গেছে`,
    earlyDismissBannerSub: 'ট্যাপ করলে শুধু আজকের মতো অ্যালার্মটি বন্ধ হবে, পরের দিন যথানিয়মে বাজবে',
    earlyDismissConfirmToast: 'আজকের অ্যালার্মটি বন্ধ করা হয়েছে',

    // 2b. Skip Next Occurrence
    skipNextBtn: 'পরের বার বাজবে না',
    resumeNextBtn: 'যথানিয়মে চালু রাখুন',
    skippingNextPrefix: 'পরের বার বন্ধ:',
    resumedScheduleToast: 'অ্যালার্ম আবার আগের নিয়মে চালু হয়েছে',
    skippingNextBadge: (dateLabel: string) => `পরের বার বন্ধ: ${dateLabel}`,

    // 2c. Categories & Group Toggles
    categoryLabel: 'ক্যাটাগরি',
    categoryAll: 'সবগুলো',
    categoryNone: 'কিছু না',
    groupToggleBtnOn: (cat: string) => `সব ${cat} চালু করুন`,
    groupToggleBtnOff: (cat: string) => `সব ${cat} বন্ধ করুন`,
    groupToggleActionOn: (cat: string) => `সব ${cat} চালু করুন`,
    groupToggleActionOff: (cat: string) => `সব ${cat} বন্ধ করুন`,
    groupToggleConfirmTitle: (cat: string, enable: boolean) =>
      `সব ${cat} অ্যালার্ম ${enable ? 'চালু' : 'বন্ধ'} করবেন?`,
    groupToggleModalTitle: (cat: string, enable: boolean) =>
      `সব ${cat} অ্যালার্ম ${enable ? 'চালু' : 'বন্ধ'} করবেন?`,
    groupToggleConfirmDesc: (cat: string, count: number, enable: boolean) =>
      `এতে ${cat} ক্যাটাগরির সবগুলো (${formatNumberLocalized(count, 'bn')}টি) অ্যালার্ম একসাথে ${
        enable ? 'চালু' : 'বন্ধ'
      } হয়ে যাবে।`,
    groupToggleModalBody: (cat: string, count: number, enable: boolean) =>
      `এতে ${cat} ক্যাটাগরির সবগুলো (${formatNumberLocalized(count, 'bn')}টি) অ্যালার্ম একসাথে ${
        enable ? 'চালু' : 'বন্ধ'
      } হয়ে যাবে।`,
    cancelBtn: 'বাতিল',
    confirmBtn: 'হ্যাঁ, করুন',
    confirmActionBtn: 'হ্যাঁ, করুন',

    // 3b. Hardware Volume Buttons & Safety Settings
    sectionHardware: 'ভলিউম বাটন ও ঘুমের সুবিধা',
    sectionSafetyAndHardware: 'ভলিউম বাটন ও সতর্কবার্তা',
    volumeButtonsLabel: 'ভলিউম বাটন চাপলে (বাজার সময়)',
    volumeButtonActionLabel: 'ফোনের ভলিউম বাটনের কাজ',
    volumeButtonActionDesc:
      'অ্যালার্ম বাজার সময় ফোনের ভলিউম বাটন চাপলে কী হবে তা ঠিক করুন',
    volumeActionSnooze: 'স্নুজ হবে',
    volumeActionDismiss: 'বন্ধ হবে',
    volumeActionNone: 'কিছু হবে না',
    volumeRingingHintSnooze: 'ভলিউম বাটন চাপলে স্নুজ হবে',
    volumeRingingHintDismiss: 'ভলিউম বাটন চাপলে অ্যালার্ম বন্ধ হবে',
    earlyDismissWindowLabel: "'ঘুম ভেঙে গেছে' অপশন দেখানোর সময়",
    earlyDismissWindowDesc:
      'অ্যালার্ম বাজার কতক্ষণ আগে থেকে আজকের অ্যালার্ম আগাম বন্ধ করার কার্ডটি দেখাবে',
    safetyCheckToggleTitle: 'ঘুমানোর আগে চার্জ ও সাউন্ড চেক',
    safetyCheckToggleDesc:
      'ফোনের চার্জ ২০% এর কম বা ভলিউম কমানো থাকলে স্ক্রিনে সতর্কবার্তা দেখাবে',
    toggleSafetyCheckTitle: 'ঘুমানোর আগে চার্জ ও সাউন্ড চেক',
    toggleSafetyCheckDesc:
      'ফোনের চার্জ ২০% এর কম, ভলিউম ৩০% এর নিচে বা নোটিফিকেশন বন্ধ থাকলে সতর্ক করবে',

    // 6a & 8. Duplicate, Swipe & Undo
    duplicateAlarmBtn: 'হুবহু আরেকটি তৈরি করুন',
    copySuffix: '(কপি)',
    editAction: 'এডিট',
    deleteAction: 'মুছে ফেলুন',
    swipeEditBtn: 'এডিট',
    swipeDeleteBtn: 'মুছুন',
    alarmDeletedToast: 'অ্যালার্ম মুছে ফেলা হয়েছে',
    alarmRestoredToast: 'অ্যালার্ম ফিরিয়ে আনা হয়েছে',
    alarmDuplicatedToast: 'একই রকম আরেকটি অ্যালার্ম তৈরি হয়েছে',
    undoBtn: 'ফিরিয়ে আনুন',
    cardActionsTitle: 'অ্যালার্মের অপশন',

    // Categories Management in Settings
    sectionCategories: 'ক্যাটাগরি সাজান',
    manageCategoriesDesc:
      'অ্যালার্মগুলো আলাদা করে রাখতে এবং এক ট্যাপে চালু/বন্ধ করতে নিজের মতো ক্যাটাগরি যোগ বা বাদ দিন।',
    newCategoryPlaceholder: 'নতুন ক্যাটাগরির নাম লিখুন...',
    addCategoryPlaceholder: 'নতুন ক্যাটাগরির নাম লিখুন...',
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
