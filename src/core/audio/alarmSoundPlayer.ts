import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

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

    const ctx = this.getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play first chord immediately
      this.playWebChimeChord(ctx);
    }

    // Set up repeating chime loop every 2.0 seconds
    this.loopInterval = setInterval(() => {
      this.triggerHapticPulse();
      const currentCtx = this.getAudioContext();
      if (currentCtx) {
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
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
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
