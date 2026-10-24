import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import * as Haptics from 'expo-haptics';

const { AlarmSound } = NativeModules;

export interface DeviceSafetyStatus {
  batteryLevel: number;
  isCharging: boolean;
  alarmVolumePercent: number;
  canUseFullScreenIntent: boolean;
}

/**
 * Universal Alarm Sound Engine & Synthesizer
 * 
 * Provides:
 * 1. Web Audio API synthesizer for clean, melodic morning chimes on Web (0 latency, 0 external assets).
 * 2. Synchronized rhythmic haptic pulses on mobile devices.
 * 3. Looping playback control, audio state management, and mute toggle.
 */

class AlarmSoundEngine {
  private audioContext: AudioContext | null = null;
  private loopInterval: ReturnType<typeof setInterval> | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return null;
    }
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    return this.audioContext;
  }

  /**
   * Plays a single gentle chime chord note sequence (C5 - E5 - G5 - C6)
   */
  private playWebChimeChord(ctx: AudioContext, gainFactor: number = 0.3) {
    if (this.isMuted) return;

    try {
      const now = ctx.currentTime;
      // Gentle ascending pentatonic bell chime frequencies (Hz)
      const notes = [
        { freq: 523.25, time: 0.0, duration: 0.6 },  // C5
        { freq: 659.25, time: 0.18, duration: 0.6 }, // E5
        { freq: 783.99, time: 0.36, duration: 0.7 }, // G5
        { freq: 1046.50, time: 0.54, duration: 0.9 }, // C6
      ];

      notes.forEach(({ freq, time, duration }) => {
        const startTime = now + time;
        const endTime = startTime + duration;

        // Primary bell tone (sine)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Overtone for bell-like brightness (harmonic)
        const overtone = ctx.createOscillator();
        const overtoneGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        overtone.type = 'triangle';
        overtone.frequency.setValueAtTime(freq * 2, startTime);

        // Amplitude envelope: instant crisp attack, smooth exponential decay
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(gainFactor, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

        overtoneGain.gain.setValueAtTime(0.0001, startTime);
        overtoneGain.gain.linearRampToValueAtTime(gainFactor * 0.25, startTime + 0.015);
        overtoneGain.gain.exponentialRampToValueAtTime(0.0001, endTime * 0.7);

        osc.connect(gain);
        overtone.connect(overtoneGain);
        gain.connect(ctx.destination);
        overtoneGain.connect(ctx.destination);

        osc.start(startTime);
        overtone.start(startTime);

        osc.stop(endTime);
        overtone.stop(endTime);
      });
    } catch (e) {
      console.warn('Error synthesizing alarm chime:', e);
    }
  }

  /**
   * Starts looping the alarm sound and rhythmic haptic feedback
   */
  public startAlarmSound(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Trigger immediate haptics on native
    this.triggerHapticPulse();

    // 1. Play native Android clock alarm sound (TYPE_ALARM)
    if (Platform.OS === 'android' && !this.isMuted) {
      try {
        AlarmSound?.playAlarmSound?.();
      } catch (e) {
        console.warn('Could not trigger native alarm sound:', e);
      }
    }

    // 2. Play Web audio chime chord on web
    const ctx = this.getAudioContext();
    if (ctx && !this.isMuted) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      this.playWebChimeChord(ctx);
    }

    // Set up repeating chime/pulse loop
    this.loopInterval = setInterval(() => {
      this.triggerHapticPulse();

      if (Platform.OS === 'android' && !this.isMuted) {
        try {
          AlarmSound?.playAlarmSound?.();
        } catch {}
      }

      const currentCtx = this.getAudioContext();
      if (currentCtx && !this.isMuted) {
        if (currentCtx.state === 'suspended') {
          currentCtx.resume().catch(() => {});
        }
        this.playWebChimeChord(currentCtx);
      }
    }, 2000);
  }

  /**
   * Stops the looping alarm sound and releases resources
   */
  public stopAlarmSound(): void {
    this.isPlaying = false;
    if (Platform.OS === 'android') {
      try {
        AlarmSound?.stopAlarmSound?.();
      } catch (e) {
        console.warn('Could not stop native alarm sound:', e);
      }
    }
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  /**
   * Stops the alarm sound and, if the device keyguard is currently locked,
   * returns the phone to the lock screen so the app isn't left open over the keyguard.
   */
  public finishLockScreenAlarmIfLocked(): void {
    this.stopAlarmSound();
    if (Platform.OS === 'android') {
      try {
        AlarmSound?.finishLockScreenAlarmIfLocked?.();
      } catch (e) {
        console.warn('Could not finish lock screen alarm:', e);
      }
    }
  }

  /**
   * Checks whether Android 14+ full-screen intent permission is granted.
   */
  public async canUseFullScreenIntent(): Promise<boolean> {
    if (Platform.OS !== 'android' || !AlarmSound?.canUseFullScreenIntent) {
      return true;
    }
    try {
      return await AlarmSound.canUseFullScreenIntent();
    } catch {
      return true;
    }
  }

  /**
   * Opens Android 14+ system settings to grant full-screen intent permission.
   */
  public openFullScreenIntentSettings(): void {
    if (Platform.OS === 'android') {
      try {
        AlarmSound?.openFullScreenIntentSettings?.();
      } catch (e) {
        console.warn('Could not open full screen intent settings:', e);
      }
    }
  }

  /**
   * Queries device battery level, charging state, alarm stream volume %, and full-screen intent permission.
   */
  public async getDeviceSafetyStatus(): Promise<DeviceSafetyStatus> {
    if (Platform.OS === 'android' && AlarmSound?.getDeviceSafetyStatus) {
      try {
        const res = await AlarmSound.getDeviceSafetyStatus();
        return {
          batteryLevel: typeof res?.batteryLevel === 'number' ? res.batteryLevel : 100,
          isCharging: Boolean(res?.isCharging ?? true),
          alarmVolumePercent:
            typeof res?.alarmVolumePercent === 'number' ? res.alarmVolumePercent : 100,
          canUseFullScreenIntent: Boolean(res?.canUseFullScreenIntent ?? true),
        };
      } catch {
        // Fallback below
      }
    }

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const battery = await (
          navigator as Navigator & {
            getBattery: () => Promise<{ level: number; charging: boolean }>;
          }
        ).getBattery();
        return {
          batteryLevel: Math.round((battery.level ?? 1) * 100),
          isCharging: Boolean(battery.charging),
          alarmVolumePercent: this.isMuted ? 0 : 100,
          canUseFullScreenIntent: true,
        };
      } catch {
        // Fallback below
      }
    }

    return {
      batteryLevel: 100,
      isCharging: true,
      alarmVolumePercent: this.isMuted ? 0 : 100,
      canUseFullScreenIntent: true,
    };
  }

  /**
   * Subscribes to hardware volume up/down button presses while an alarm is ringing.
   */
  public addHardwareVolumeListener(callback: () => void): () => void {
    if (Platform.OS === 'android') {
      const sub = DeviceEventEmitter.addListener('onHardwareVolumeButtonPressed', () => {
        callback();
      });
      return () => sub.remove();
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handler = (e: KeyboardEvent) => {
        if (
          e.key === 'AudioVolumeUp' ||
          e.key === 'AudioVolumeDown' ||
          e.key === 'VolumeUp' ||
          e.key === 'VolumeDown'
        ) {
          e.preventDefault();
          callback();
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }

    return () => {};
  }

  /**
   * Triggers haptic pulse on mobile devices
   */
  private triggerHapticPulse(): void {
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    } catch {}
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

export const alarmSoundPlayer = new AlarmSoundEngine();
