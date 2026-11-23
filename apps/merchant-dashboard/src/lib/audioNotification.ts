/**
 * Web Audio API synthesized restaurant service bell & order alerts
 * Runs 100% locally in the browser with zero external network or audio file dependencies.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("souqna_merchant_sound");
      this.soundEnabled = saved === null ? true : saved === "true";
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("souqna_merchant_sound", String(enabled));
    }
  }

  public toggle(): boolean {
    const next = !this.soundEnabled;
    this.setEnabled(next);
    if (next) {
      this.playOrderBell();
    }
    return next;
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx && AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Restaurant Bell Chime (Ding-Dong ~880Hz / 1320Hz)
   */
  public playOrderBell(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Note 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Note 2: 1318.5Hz (E6) starting after 120ms
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1318.5, now + 0.12);
      gain2.gain.setValueAtTime(0.5, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 1.6);
    } catch (e) {
      console.warn("Audio play error:", e);
    }
  }

  /**
   * Urgent Repeat Bell (for pending unhandled orders)
   */
  public playUrgentBell(): void {
    this.playOrderBell();
    setTimeout(() => {
      this.playOrderBell();
    }, 400);
  }
}

export const soundService = new SoundService();
