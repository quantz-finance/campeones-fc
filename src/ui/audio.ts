// Sonido sintetizado con Web Audio (sin archivos). Diseño y licencia: docs/AUDIO.md.
// Interfaz de transmisión: ticks de ruido, barridos de aire y un groove de house.
// Sin ondas cuadradas ni glissandi de «boing» en los clics.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AUDIO_LEVELS, readMuted, writeMuted } from './audio-prefs';

const web = Platform.OS === 'web';
const BPM = 124;
const BARS = 8;
const STEPS = 16;

type Listener = (muted: boolean) => void;

function browserStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Acordes en senos (menor, con séptima suave). Graves de house, no de chiptune. */
const CHORDS: Record<string, number[]> = {
  Am: [220, 261.63, 329.63],
  F: [174.61, 220, 261.63],
  C: [261.63, 329.63, 392],
  G: [196, 246.94, 293.66],
};

/** Bajo por compás: tiempo 1, contratiempo y una nota de paso. 0 = silencio. */
const BASS: number[][] = [
  [55, 0, 0, 55, 0, 0, 82.41, 0, 55, 0, 0, 65.41, 0, 0, 55, 0],
  [55, 0, 0, 0, 82.41, 0, 55, 0, 65.41, 0, 0, 55, 0, 82.41, 0, 0],
  [43.65, 0, 0, 43.65, 0, 0, 65.41, 0, 43.65, 0, 87.31, 0, 0, 0, 43.65, 0],
  [43.65, 0, 65.41, 0, 43.65, 0, 0, 87.31, 43.65, 0, 0, 65.41, 0, 0, 43.65, 0],
  [65.41, 0, 0, 65.41, 0, 0, 98, 0, 65.41, 0, 0, 82.41, 0, 0, 65.41, 0],
  [65.41, 0, 82.41, 0, 65.41, 0, 98, 0, 65.41, 0, 49, 0, 82.41, 0, 65.41, 0],
  [49, 0, 0, 49, 0, 0, 73.42, 0, 49, 0, 98, 0, 0, 73.42, 49, 0],
  [49, 0, 73.42, 0, 49, 0, 0, 98, 0, 0, 73.42, 0, 49, 0, 55, 0],
];

const CHORD_OF = ['Am', 'Am', 'F', 'F', 'C', 'C', 'G', 'Am'] as const;

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
  private crowdLfo: OscillatorNode | null = null;
  private nextStep = 0;
  private stepIndex = 0;
  private unlocked = false;
  private watching = false;
  private introPlayed = false;

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

  /** Tick seco: transiente de ruido + cuerpo grave fijo, sin tono que se deslice. */
  click() {
    const ctx = this.live();
    if (!ctx || !this.sfx) return;
    const now = ctx.currentTime;
    this.burst(ctx, this.sfx, now, 0.016, 0.32, 'highpass', 4200);
    this.sine(ctx, this.sfx, now, 148, 0.28, 0.04);
  }

  /** Barrido de aire: dos capas de ruido, una grave y otra brillante. */
  whoosh() {
    const ctx = this.live();
    if (!ctx || !this.sfx) return;
    const now = ctx.currentTime;
    this.burst(ctx, this.sfx, now, 0.18, 0.2, 'bandpass', 420, 2800, 0.55);
    this.burst(ctx, this.sfx, now + 0.02, 0.16, 0.1, 'highpass', 1600, 6400, 0.4);
  }

  confirm() {
    const ctx = this.live();
    if (!ctx || !this.sfx) return;
    const now = ctx.currentTime;
    this.burst(ctx, this.sfx, now, 0.028, 0.22, 'highpass', 2800);
    this.sine(ctx, this.sfx, now, 196, 0.16, 0.07);
  }

  /** Subida corta y golpe de estadio. Una sola vez, después de un gesto. */
  intro() {
    this.unlock();
    if (this.introPlayed || this.muted) return;
    this.introPlayed = true;
    const ctx = this.live();
    if (!ctx || !this.sfx) return;
    const now = ctx.currentTime;
    this.riser(ctx, this.sfx, now, 0.42, 0.14);
    const hit = now + 0.36;
    this.kick(ctx, this.sfx, hit, 0.9);
    this.burst(ctx, this.sfx, hit, 0.05, 0.28, 'bandpass', 1800, undefined, 0.8);
    this.pluck(ctx, this.sfx, hit, CHORDS.Am, 0.07, 0.28);
  }

  private live(): AudioContext | null {
    if (this.muted || !this.unlocked || !this.ctx || !this.sfx) return null;
    return this.ctx;
  }

  private amp(ctx: AudioContext, when: number, peak: number, attack: number, decay: number) {
    const gain = ctx.createGain();
    const a = Math.max(0.001, attack);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), when + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + a + Math.max(0.01, decay));
    return gain;
  }

  private sine(ctx: AudioContext, dest: GainNode, when: number, freq: number, peak: number, decay: number) {
    const gain = this.amp(ctx, when, peak, 0.002, decay);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, when);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + decay + 0.04);
  }

  private burst(
    ctx: AudioContext,
    dest: GainNode,
    when: number,
    dur: number,
    peak: number,
    type: BiquadFilterType,
    freq: number,
    freqTo?: number,
    q = 0.7,
  ) {
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(40, freq), when);
    if (freqTo) filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), when + Math.max(0.01, dur));
    const gain = this.amp(ctx, when, peak, 0.002, dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(when);
    src.stop(when + dur + 0.03);
  }

  private riser(ctx: AudioContext, dest: GainNode, when: number, dur: number, peak: number) {
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.85;
    filter.frequency.setValueAtTime(180, when);
    filter.frequency.exponentialRampToValueAtTime(5200, when + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), when + dur * 0.92);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(when);
    src.stop(when + dur + 0.02);
  }

  /** Acorde corto, filtrado, solo senos. */
  private pluck(ctx: AudioContext, dest: GainNode, when: number, freqs: number[], peak: number, decay: number) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, when);
    filter.frequency.exponentialRampToValueAtTime(420, when + decay);
    const gain = this.amp(ctx, when, 1, 0.004, decay);
    filter.connect(gain);
    gain.connect(dest);
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, when);
      const partial = ctx.createGain();
      partial.gain.value = peak;
      osc.connect(partial);
      partial.connect(filter);
      osc.start(when);
      osc.stop(when + decay + 0.03);
    }
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
    crowdFilter.frequency.value = 380;
    const crowdGain = ctx.createGain();
    crowdGain.gain.value = 0.028;
    this.crowdLfo = ctx.createOscillator();
    this.crowdLfo.frequency.value = 0.12;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.01;
    this.crowdLfo.connect(lfoDepth);
    lfoDepth.connect(crowdGain.gain);
    this.crowd.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(this.music);
    this.crowd.start();
    this.crowdLfo.start();
    this.nextStep = ctx.currentTime + 0.06;
    this.stepIndex = 0;
    this.timer = setInterval(() => this.pump(), 25);
  }

  private stopMusic() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const node of [this.crowd, this.crowdLfo]) {
      try {
        node?.stop();
      } catch {
        // ya estaba parado
      }
    }
    this.crowd = null;
    this.crowdLfo = null;
  }

  private pump() {
    const ctx = this.ctx;
    const dest = this.music;
    if (!ctx || !dest || !this.noise || this.muted) return;
    const sixteenth = 60 / BPM / 4;
    while (this.nextStep < ctx.currentTime + 0.14) {
      this.scheduleStep(ctx, dest, this.nextStep, this.stepIndex);
      this.nextStep += sixteenth;
      this.stepIndex = (this.stepIndex + 1) % (STEPS * BARS);
    }
  }

  private scheduleStep(ctx: AudioContext, dest: GainNode, when: number, index: number) {
    const bar = Math.floor(index / STEPS);
    const step = index % STEPS;
    const building = bar === BARS - 1;
    const full = bar >= 4 && !building;
    const groove = bar >= 2;

    if (step % 4 === 0 && !(building && step >= 8)) this.kick(ctx, dest, when, full ? 0.95 : 0.8);
    if ((step === 4 || step === 12) && bar >= 1 && !(building && step === 12)) this.clap(ctx, dest, when);
    if (step % 2 === 0) this.hat(ctx, dest, when, full ? 0.07 : 0.045, false);
    else if (groove && (step === 6 || step === 14)) this.hat(ctx, dest, when, 0.05, true);
    else if (full) this.hat(ctx, dest, when, 0.018, false);
    if (groove && step % 4 === 3) this.burst(ctx, dest, when, 0.04, 0.05, 'bandpass', 480, undefined, 1.2);

    const note = BASS[bar]?.[step] ?? 0;
    if (note && !(building && step >= 8)) this.sub(ctx, dest, when, note);

    const stab = full ? step % 4 === 2 : groove && (step === 4 || step === 12);
    if (stab) this.pluck(ctx, dest, when, CHORDS[CHORD_OF[bar] ?? 'Am'], full ? 0.045 : 0.03, 0.12);

    if (building && step === 8) this.riser(ctx, dest, when, 60 / BPM, 0.12);
  }

  /** Bombo de club: seno que cae en pocos milisegundos y un clic de mazo. */
  private kick(ctx: AudioContext, dest: GainNode, when: number, peak: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(168, when);
    osc.frequency.exponentialRampToValueAtTime(44, when + 0.055);
    const gain = this.amp(ctx, when, peak, 0.002, 0.18);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + 0.22);
    this.burst(ctx, dest, when, 0.01, peak * 0.18, 'highpass', 2200);
  }

  private clap(ctx: AudioContext, dest: GainNode, when: number) {
    this.burst(ctx, dest, when, 0.04, 0.16, 'bandpass', 1700, undefined, 0.9);
    this.burst(ctx, dest, when + 0.012, 0.05, 0.1, 'highpass', 2400);
  }

  private hat(ctx: AudioContext, dest: GainNode, when: number, peak: number, open: boolean) {
    this.burst(ctx, dest, when, open ? 0.09 : 0.025, peak, 'highpass', open ? 6500 : 8000);
  }

  private sub(ctx: AudioContext, dest: GainNode, when: number, freq: number) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.4, when);
    osc.frequency.exponentialRampToValueAtTime(freq, when + 0.012);
    const gain = this.amp(ctx, when, 0.2, 0.003, 0.16);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + 0.2);
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

export function playIntro() {
  audio.intro();
}

export function toggleMuted() {
  audio.toggle();
}

export function useMuted(): boolean {
  const [muted, setMuted] = useState(() => audio.isMuted());
  useEffect(() => audio.subscribe(setMuted), []);
  return muted;
}
