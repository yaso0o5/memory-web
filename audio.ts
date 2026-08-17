/* ————————————————————————————————————————————————
   THE QUIET LAYER — procedural audio engine
   A calm, cinematic ambience + restrained UI sound,
   synthesised live with the Web Audio API (no files,
   no remote audio, nothing to download).

   The ambience grows with the site's memory of you:
   a new visitor hears a single low drone; a familiar
   one hears a fuller, breathing chord. Everything is
   extremely quiet by design.
———————————————————————————————————————————————— */

const PREF_KEY = "twam.audio.v1";
const SUB = 55.0; // A1 — a constant pedal under everything

/* chords (root, third, fifth) drifting through A-minor */
const CHORDS: number[][] = [
  [110.0, 130.81, 164.81], // Am
  [87.31, 110.0, 130.81], // F
  [130.81, 164.81, 196.0], // C
  [98.0, 123.47, 146.83], // G
];

/* layer loudness per relationship stage (0 → 4) */
const LEVELS = [
  { sub: 0.05, pad: 0.02, air: 0, shimmer: 0, oct: 0 },
  { sub: 0.06, pad: 0.028, air: 0, shimmer: 0, oct: 0 },
  { sub: 0.06, pad: 0.034, air: 0.006, shimmer: 0, oct: 0 },
  { sub: 0.06, pad: 0.04, air: 0.008, shimmer: 0.005, oct: 0 },
  { sub: 0.065, pad: 0.045, air: 0.01, shimmer: 0.007, oct: 0.01 },
];

export type SfxType =
  | "click"
  | "hover"
  | "open"
  | "close"
  | "theme"
  | "secret"
  | "door"
  | "whisper";

function loadPref(): boolean {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw == null) return true; // on until the visitor says otherwise
    return JSON.parse(raw)?.enabled !== false;
  } catch {
    return true;
  }
}

function savePref(enabled: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ enabled }));
  } catch {
    /* preference simply won't persist */
  }
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private enabled = loadPref();
  private stage = 0;
  private started = false;
  private chordIdx = 0;
  private chordTimer: number | null = null;

  // ambient layers
  private sub?: OscillatorNode;
  private subGain?: GainNode;
  private padOsc: OscillatorNode[] = [];
  private padFilter?: BiquadFilterNode;
  private padGain?: GainNode;
  private airGain?: GainNode;
  private airSrc?: AudioBufferSourceNode;
  private shimOsc?: OscillatorNode;
  private shimGain?: GainNode;
  private tremGain?: GainNode;
  private octOsc?: OscillatorNode;
  private octGain?: GainNode;
  private lfo?: OscillatorNode;

  get isEnabled(): boolean {
    return this.enabled;
  }

  /* ————— lifecycle ————— */

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  /** Called on a real user gesture — builds the context and starts the drone. */
  ensureStarted(): void {
    this.ensureCtx();
    this.startAmbient();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    savePref(on);
    if (on) {
      this.ensureStarted();
    } else {
      this.fadeMusic(0);
      window.setTimeout(() => {
        if (!this.enabled && this.ctx?.state === "running") this.ctx.suspend().catch(() => {});
      }, 900);
    }
  }

  suspend(): void {
    if (this.ctx?.state === "running") this.ctx.suspend().catch(() => {});
  }

  resume(): void {
    if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {});
  }

  dispose(): void {
    if (this.chordTimer != null) {
      clearInterval(this.chordTimer);
      this.chordTimer = null;
    }
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.started = false;
    this.padOsc = [];
  }

  /* ————— the ambience ————— */

  private startAmbient(): void {
    if (!this.ensureCtx()) return;
    if (!this.started) {
      this.buildAmbient();
      this.started = true;
    }
    this.fadeMusic(1);
  }

  private fadeMusic(to: number): void {
    if (!this.musicBus || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(to, t, 0.9);
  }

  private noiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private buildAmbient(): void {
    const ctx = this.ctx!;

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master!);

    // sub drone — the constant low presence
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0;
    this.subGain.connect(this.musicBus);
    this.sub = ctx.createOscillator();
    this.sub.type = "sine";
    this.sub.frequency.value = SUB;
    this.sub.connect(this.subGain);
    this.sub.start();

    // pad — three softly-detuned voices through a lowpass
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = "lowpass";
    this.padFilter.frequency.value = 620;
    this.padFilter.Q.value = 0.7;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0;
    this.padFilter.connect(this.padGain);
    this.padGain.connect(this.musicBus);
    this.padOsc = CHORDS[0].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      o.detune.value = [0, -4, 5][i];
      o.connect(this.padFilter!);
      o.start();
      return o;
    });

    // air — a faint breath of filtered noise
    this.airGain = ctx.createGain();
    this.airGain.gain.value = 0;
    this.airGain.connect(this.musicBus);
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 1700;
    airFilter.Q.value = 0.5;
    this.airSrc = ctx.createBufferSource();
    this.airSrc.buffer = this.noiseBuffer();
    this.airSrc.loop = true;
    this.airSrc.connect(airFilter);
    airFilter.connect(this.airGain);
    this.airSrc.start();

    // shimmer — a high, faint sparkle
    this.shimGain = ctx.createGain();
    this.shimGain.gain.value = 0;
    this.shimGain.connect(this.musicBus);
    this.shimOsc = ctx.createOscillator();
    this.shimOsc.type = "sine";
    this.shimOsc.frequency.value = CHORDS[0][1] * 8;
    this.shimOsc.connect(this.shimGain);
    this.shimOsc.start();

    // octave — a soft upper echo of the drone
    this.octGain = ctx.createGain();
    this.octGain.gain.value = 0;
    this.octGain.connect(this.musicBus);
    this.octOsc = ctx.createOscillator();
    this.octOsc.type = "sine";
    this.octOsc.frequency.value = SUB * 2;
    this.octOsc.connect(this.octGain);
    this.octOsc.start();

    // breathing LFO on the pad filter
    this.lfo = ctx.createOscillator();
    this.lfo.type = "sine";
    this.lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 170;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.padFilter.frequency);
    this.lfo.start();

    // slow tremolo on the shimmer
    const trem = ctx.createOscillator();
    trem.type = "sine";
    trem.frequency.value = 0.11;
    this.tremGain = ctx.createGain();
    this.tremGain.gain.value = 0;
    trem.connect(this.tremGain);
    this.tremGain.connect(this.shimGain.gain);
    trem.start();

    this.scheduleChords();
    this.applyLayerLevels();
  }

  private applyLayerLevels(): void {
    if (!this.ctx) return;
    const L = LEVELS[Math.min(4, this.stage)];
    const t = this.ctx.currentTime;
    const ramp = (g: GainNode | undefined, v: number) => {
      if (!g) return;
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(v, t, 1.2);
    };
    ramp(this.subGain, L.sub);
    ramp(this.padGain, L.pad);
    ramp(this.airGain, L.air);
    ramp(this.shimGain, L.shimmer);
    ramp(this.octGain, L.oct);
    ramp(this.tremGain, L.shimmer * 0.4);
  }

  setStage(stage: number): void {
    if (this.stage === stage) return;
    this.stage = stage;
    if (this.started) this.applyLayerLevels();
  }

  private scheduleChords(): void {
    if (this.chordTimer != null) return;
    this.chordTimer = window.setInterval(() => this.advanceChord(), 22000);
  }

  private advanceChord(): void {
    if (!this.ctx) return;
    this.chordIdx = (this.chordIdx + 1) % CHORDS.length;
    const chord = CHORDS[this.chordIdx];
    const t = this.ctx.currentTime;
    this.padOsc.forEach((o, i) => o.frequency.setTargetAtTime(chord[i], t, 2.5));
    this.shimOsc?.frequency.setTargetAtTime(chord[1] * 8, t, 2.5);
  }

  /* ————— one-shot sound effects ————— */

  sfx(type: SfxType): void {
    if (!this.enabled) return;
    if (!this.ctx || !this.master || this.ctx.state !== "running") return;
    switch (type) {
      case "click":
        this.blip(920, 460, 0.05, 0.09);
        break;
      case "hover":
        this.blip(660, 700, 0.014, 0.14);
        break;
      case "open":
        this.noiseSwell(320, 1500, 0.035, 0.5);
        break;
      case "close":
        this.noiseSwell(1300, 320, 0.028, 0.42);
        break;
      case "theme":
        this.themeSwell();
        break;
      case "secret":
        this.secretChime();
        break;
      case "door":
        this.doorThud();
        break;
      case "whisper":
        this.noiseSwell(900, 1900, 0.022, 0.7);
        break;
    }
  }

  private blip(freq: number, endFreq: number, peak: number, dur: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseSwell(freqFrom: number, freqTo: number, peak: number, dur: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(freqFrom, t);
    bp.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  private themeSwell(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    [261.63, 392.0, 523.25].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.03 - i * 0.008, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g);
      g.connect(this.master!);
      o.start(t);
      o.stop(t + 1.5);
    });
  }

  private secretChime(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const partials = [
      { f: 523.25, g: 0.05, d: 2.2 },
      { f: 1046.5, g: 0.016, d: 1.6 },
      { f: 1567.98, g: 0.008, d: 1.0 },
    ];
    partials.forEach((p, i) => {
      const at = t + i * 0.02;
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = p.f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(p.g, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + p.d);
      o.connect(g);
      g.connect(this.master!);
      o.start(at);
      o.stop(at + p.d + 0.05);
    });
  }

  private doorThud(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(96, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g);
    g.connect(this.master!);
    o.start(t);
    o.stop(t + 0.6);
    this.noiseSwell(220, 900, 0.02, 0.18);
  }
}

export const audio = new AudioEngine();
