// Sonido sintetizado con Web Audio (sin archivos). Licencia y diseño: docs/AUDIO.md.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AUDIO_LEVELS, readMuted, writeMuted } from './audio-prefs';

const web = Platform.OS === 'web';

type Listener = (muted: boolean) => void;

function browserStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function envGain(ctx: AudioContext, when: number, peak: number, duration: number) {
  const gain = ctx.createGain();
  const safe = Math.max(peak, 0.0001);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(safe, when + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  return gain;
}

class AudioEngine {
  muted = readMuted(browserStorage());
  private listeners = new Set<Listener>();
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private crowd: AudioBufferSourceNode | null = null;
  private nextStep = 0;
  private stepIndex = 0;
  private unlocked = false;
  private watching = false;

  isMuted() {
    return this.muted;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((listener) => listener(this.muted));
  }

  unlock() {
    if (!web || typeof window === 'undefined' || typeof AudioContext === 'undefined') return;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = AUDIO_LEVELS.master;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = AUDIO_LEVELS.music;
      this.music.connect(this.master);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = AUDIO_LEVELS.sfx;
      this.sfx.connect(this.master);
      this.noise = this.makeNoise(this.ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.unlocked = true;
    this.watchVisibility();
    if (!this.muted) this.startMusic();
  }

  toggle() {
    this.unlock();
    this.muted = !this.muted;
    writeMuted(browserStorage(), this.muted);
    if (this.muted) this.stopMusic();
    else this.startMusic();
    this.emit();
  }

  click() {
    const ctx = this.live();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 740, now, 0.045, 'square', 0.16);
    this.tone(ctx, 180, now, 0.07, 'sine', 0.2);
  }

  whoosh() {
    const ctx = this.live();
    if (!ctx || !this.sfx || !this.noise) return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.16);
    filter.Q.value = 0.7;
    const gain = envGain(ctx, now, 0.35, 0.2);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfx);
    source.start(now);
    source.stop(now + 0.22);
  }

  confirm() {
    const ctx = this.live();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tone(ctx, 523.25, now, 0.12, 'triangle', 0.18);
    this.tone(ctx, 659.25, now + 0.07, 0.16, 'triangle', 0.16);
  }

  private live(): AudioContext | null {
    if (this.muted || !this.unlocked || !this.ctx || !this.sfx) return null;
    return this.ctx;
  }

  private tone(ctx: AudioContext, freq: number, when: number, duration: number, type: OscillatorType, peak: number) {
    if (!this.sfx) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.7), when + duration);
    const gain = envGain(ctx, when, peak, duration);
    osc.connect(gain);
    gain.connect(this.sfx);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  private makeNoise(ctx: AudioContext) {
    const length = Math.floor(ctx.sampleRate * 1);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private startMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.music || !this.noise || this.timer || this.muted) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    this.crowd = ctx.createBufferSource();
    this.crowd.buffer = this.noise;
    this.crowd.loop = true;
    const crowdFilter = ctx.createBiquadFilter();
    crowdFilter.type = 'lowpass';
    crowdFilter.frequency.value = 420;
    const crowdGain = ctx.createGain();
    crowdGain.gain.value = 0.045;
    this.crowd.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(this.music);
    this.crowd.start();
    this.nextStep = ctx.currentTime + 0.08;
    this.stepIndex = 0;
    this.timer = setInterval(() => this.pump(), 25);
  }

  private stopMusic() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.crowd) {
      try {
        this.crowd.stop();
      } catch {
        // ya estaba parado
      }
      this.crowd = null;
    }
  }

  private pump() {
    const ctx = this.ctx;
    const dest = this.music;
    if (!ctx || !dest || !this.noise || this.muted) return;
    const eighth = 60 / 112 / 2;
    while (this.nextStep < ctx.currentTime + 0.12) {
      this.scheduleStep(ctx, dest, this.nextStep, this.stepIndex);
      this.nextStep += eighth;
      this.stepIndex = (this.stepIndex + 1) % 16;
    }
  }

  private scheduleStep(ctx: AudioContext, dest: GainNode, when: number, step: number) {
    if (step % 4 === 0) this.kick(ctx, dest, when);
    if (step === 4 || step === 12) this.snare(ctx, dest, when);
    this.hat(ctx, dest, when, step % 2 === 0 ? 0.05 : 0.025);
    const bass = [55, 0, 0, 65.41, 0, 55, 0, 82.41, 55, 0, 73.42, 0, 65.41, 0, 55, 0][step] ?? 0;
    if (bass) this.bass(ctx, dest, when, bass);
    if (step === 0) this.stab(ctx, dest, when);
  }

  private kick(ctx: AudioContext, dest: GainNode, when: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, when);
    osc.frequency.exponentialRampToValueAtTime(48, when + 0.12);
    const gain = envGain(ctx, when, 0.9, 0.16);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + 0.18);
  }

  private snare(ctx: AudioContext, dest: GainNode, when: number) {
    if (!this.noise) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1400;
    const gain = envGain(ctx, when, 0.28, 0.1);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(when);
    source.stop(when + 0.12);
    this.toneInto(ctx, dest, 196, when, 0.08, 'triangle', 0.12);
  }

  private hat(ctx: AudioContext, dest: GainNode, when: number, peak: number) {
    if (!this.noise) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = envGain(ctx, when, peak, 0.04);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(when);
    source.stop(when + 0.05);
  }

  private bass(ctx: AudioContext, dest: GainNode, when: number, freq: number) {
    this.toneInto(ctx, dest, freq, when, 0.18, 'sawtooth', 0.12);
  }

  private stab(ctx: AudioContext, dest: GainNode, when: number) {
    for (const freq of [523.25, 659.25, 783.99]) {
      this.toneInto(ctx, dest, freq, when, 0.18, 'sawtooth', 0.045);
    }
  }

  private toneInto(ctx: AudioContext, dest: GainNode, freq: number, when: number, duration: number, type: OscillatorType, peak: number) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'sawtooth' ? 900 : 4000, when);
    const gain = envGain(ctx, when, peak, duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  private watchVisibility() {
    if (this.watching || typeof document === 'undefined') return;
    this.watching = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stopMusic();
      else if (!this.muted && this.unlocked) this.startMusic();
    });
  }
}

export const audio = new AudioEngine();

export function unlockAudio() {
  audio.unlock();
}

export function playClick() {
  audio.click();
}

export function playWhoosh() {
  audio.whoosh();
}

export function playConfirm() {
  audio.confirm();
}

export function toggleMuted() {
  audio.toggle();
}

export function useMuted(): boolean {
  const [muted, setMuted] = useState(() => audio.isMuted());
  useEffect(() => audio.subscribe(setMuted), []);
  return muted;
}
