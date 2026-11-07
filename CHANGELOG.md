# Changelog

All notable changes to **Alarming** are documented in this file.

## [1.0.0] - Initial Release

### Added
- **Multi-Mode Interval Alarm Engine**:
  - **Single Alarm**: Standard single-trigger alarm with repeat day scheduling.
  - **Window Mode**: Automatically generates an alarm sequence between a Start Time and End Time at fixed or escalating intervals.
  - **Before / After Mode**: Automatically generates an alarm cascade leading up to (`Before`) or following (`After`) a target time.
  - **Escalating Intervals**: Progressive interval tightening (`15m → 10m → 5m → 3m → 2m → 1m`) as the target or end time approaches.
  - **Granular Sequence Editor**: Expandable list inside Edit Alarm to toggle individual steps on/off or customize specific step times.
- **Categories & Smart Day-Boundary Group Pause**:
  - Custom category tags (`Work`, `Personal`, `Workout`, `Medicine`, plus user-created tags), with automatic category pre-selection when creating a new alarm inside an active category filter.
  - Full-width category action bar to pause or resume all alarms in a category at once (counting only active alarms when pausing).
  - Smart midnight (`12:00 AM`) pause modes: **Rest of Today (Until 12:00 AM)** or **Through Tomorrow (Until Tomorrow 12:00 AM)** with automatic radio pre-selection based on whether today's alarms have already passed.
  - Compact status badges (`Off today • Resumes 12 AM` / `Off tomorrow • Resumes <Day>`) on paused cards.
- **Smart Wake-Up & Quick Controls**:
  - Category-scoped **"Already awake?"** early dismissal banner when an upcoming alarm is within the configurable wake-up window (15/30/45/60 min), with 2-second minute-boundary synchronization.
  - **Skip Next Occurrence** & **Duplicate Alarm** via swipe actions or long-press quick actions modal (preserving empty labels, cancelling pending snoozes on skip, and clearing stale skip states when toggled).
  - **Undo Delete** recovery toast across swipe-to-delete, long-press delete, and inside the Edit Alarm modal.
  - **Power Nap** quick-start floating pill with long-press duration presets, 5-minute custom stepper, and active countdown.
  - **System & Permission Check** header indicator for notification permissions, low battery, and alarm volume warnings.
  - Hardware volume button actions (`Snooze`, `Stop`, or `Nothing`) while an alarm is ringing.
  - Accurate overnight cycle date tracking (`dayOffset = -1`) for **Skip Next**, **Dismiss All Remaining Today**, and **Snooze** deduplication across midnight.
- **Responsive Design & Polish**:
  - Responsive scaling (`useResponsive`) across 720p compact phones, standard phones, and tablets (`maxWidth` centered layouts).
  - Full Android 3-button navigation and gesture navigation bar safe-area clearance across all screens, floating action buttons, and bottom sheet modals.
  - Balanced modern border radii across cards, modals, buttons, chips, and squircle toggles.
  - Clean containerless alarm ringing screen with `"Time's up!"` fallback header, single top-header label display, and live wall-clock time digits paired with a compact `AM`/`PM` indicator.
  - Compact secondary `AM`/`PM` typography and active-of-total custom step counts on alarm cards so Window ranges fit cleanly on 720p displays without shrinking.
  - Full-surface clickable alarm cards (including all outer paddings), horizontal swipe gesture lock (`onPanResponderTerminationRequest`), and consistent modal heights when switching between `Single`, `Window`, and `Before/After` tabs.
  - Scroll-safe radial clock dial (`GoogleRadialClock`) that allows vertical modal scrolling over the clock face without accidentally changing the alarm time, while keeping the clock hand thumb draggable, numbers tappable, and single-digit keypad input immediately synced.
- **Localization & Themes**:
  - Full **English** and **Bangla (বাংলা)** localization including localized numerals, 12-hour time formatting, localized lockscreen notification action buttons, and automatic rescheduling of active OS notifications when switching languages.
  - **Dark** and **Light** themes.
- **Over-The-Air (OTA) Updates & Changelog**:
  - Automatic background OTA updates and manual **Check for Updates** button in Settings powered by `expo-updates`.
  - In-app **Changelog (`v1.0.0`)** viewer in Settings.
