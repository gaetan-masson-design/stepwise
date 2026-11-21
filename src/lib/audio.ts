import * as Tone from "tone";
import { chordMidi, melodyMidi, midiToFreq, type ChordSpec, type Mode } from "./theory";
import { totalBeats, type Arrangement } from "./song";
import { arrangeChords, DEFAULT_MIX, type Mix } from "./arrange";

type PartEvent =
  | { kind: "pad" | "bass" | "note"; time: string; notes: number[]; durTicks: number }
  | { kind: "click"; time: string; accent: boolean };

/** Base levels in dB; the mixer scales these. */
const LEVELS = { pad: -20, bass: -8, lead: -16 };
const toDb = (gain: number) => (gain <= 0 ? -Infinity : 20 * Math.log10(gain));

/**
 * Wraps Tone.js: three instruments plus the Transport, which keeps musical time.
 * The song is turned into a Tone.Part; editing during playback reloads the part
 * without stopping the Transport.
 */
class Engine {
  private ready = false;
  private pad!: Tone.PolySynth;
  private bass!: Tone.MonoSynth;
  private lead!: Tone.Synth;
  private click!: Tone.Synth;
  private part: Tone.Part<PartEvent> | null = null;
  private endEvent: number | null = null;
  private mix: Mix = DEFAULT_MIX;
  private lastPreview = 0;

  /** Mono synths reject two starts at the same instant (e.g. fast drags), so space previews apart. */
  private previewTime() {
    this.lastPreview = Math.max(Tone.now(), this.lastPreview + 0.01);
    return this.lastPreview;
  }
  onEnd: (() => void) | null = null;

  private get transport() {
    return Tone.getTransport();
  }
  private get ppq() {
    return this.transport.PPQ;
  }

  /** Must run after a user gesture (browsers block audio until then). */
  async init() {
    await Tone.start();
    if (this.ready) return;
    const out = new Tone.Compressor(-18, 3).toDestination();
    const padFilter = new Tone.Filter(1500, "lowpass").connect(out);
    this.pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fatsawtooth", count: 2, spread: 16 },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.6, release: 0.35 },
      volume: LEVELS.pad,
    }).connect(padFilter);
    this.bass = new Tone.MonoSynth({
      oscillator: { type: "triangle" },
      filter: { Q: 1, type: "lowpass" },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, baseFrequency: 200, octaves: 2 },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.2 },
      volume: LEVELS.bass,
    }).connect(out);
    const leadFilter = new Tone.Filter(2600, "lowpass").connect(out);
    this.lead = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.12 },
      volume: LEVELS.lead,
    }).connect(leadFilter);
    this.click = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 },
      volume: -8,
    }).connect(out);
    this.ready = true;
    this.setMix(this.mix);
  }

  /**
   * Unlocks audio from inside a tap or key press (iOS and most browsers keep it silent until
   * then). Resolves true once sound can play.
   */
  async unlock() {
    try {
      await this.init();
    } catch {
      return false;
    }
    return Tone.getContext().state === "running";
  }

  /** iOS suspends audio when the app goes to the background; wake it when it's back. */
  resume() {
    if (this.ready && Tone.getContext().state !== "running") void Tone.getContext().resume();
  }

  /** Sets track levels (0..1). Can be called before audio starts. */
  setMix(mix: Mix) {
    this.mix = mix;
    if (!this.ready) return;
    this.pad.volume.value = LEVELS.pad + toDb(mix.chords);
    this.bass.volume.value = LEVELS.bass + toDb(mix.bass);
    this.lead.volume.value = LEVELS.lead + toDb(mix.melody);
  }

  private ticks(beats: number) {
    return Math.round(beats * this.ppq);
  }

  /** Rebuilds the scheduled events from the song. Safe to call while playing. */
  load(song: Arrangement) {
    if (!this.ready) return;
    const t = this.transport;
    t.bpm.value = song.bpm;
    t.timeSignature = song.beatsPerBar;
    const end = this.ticks(totalBeats(song));

    const events: PartEvent[] = [];
    const { pad, bass } = arrangeChords(song);
    const add = (kind: "pad" | "bass" | "note", start: number, dur: number, notes: number[]) =>
      events.push({ kind, time: `${this.ticks(start)}i`, notes, durTicks: this.ticks(dur) });
    pad.forEach((h) => add("pad", h.start, h.dur, h.notes));
    bass.forEach((h) => add("bass", h.start, h.dur, h.notes));
    song.notes.forEach((n) => add("note", n.start, n.dur, [melodyMidi(n.step, n.acc, song.key, song.mode)]));
    if (song.metronome) {
      for (let b = 0; b < totalBeats(song); b++)
        events.push({ kind: "click", time: `${this.ticks(b)}i`, accent: b % song.beatsPerBar === 0 });
    }

    this.part?.dispose();
    this.part = new Tone.Part<PartEvent>((time, ev) => this.trigger(ev, time), events).start(0);

    t.loop = song.loop;
    t.loopStart = 0;
    t.loopEnd = `${end}i`;

    if (this.endEvent !== null) t.clear(this.endEvent);
    this.endEvent = song.loop
      ? null
      : t.scheduleOnce((time) => Tone.getDraw().schedule(() => this.onEnd?.(), time), `${end}i`);
  }

  private trigger(ev: PartEvent, time: number) {
    const secs = (ticks: number) => Tone.Ticks(ticks).toSeconds();
    if (ev.kind === "pad") {
      this.pad.triggerAttackRelease(ev.notes.map(midiToFreq), secs(ev.durTicks), time);
    } else if (ev.kind === "bass") {
      this.bass.triggerAttackRelease(midiToFreq(ev.notes[0]), secs(ev.durTicks) * 0.95, time);
    } else if (ev.kind === "note") {
      this.lead.triggerAttackRelease(midiToFreq(ev.notes[0]), secs(ev.durTicks) * 0.92, time);
    } else if (ev.kind === "click") {
      this.click.triggerAttackRelease(ev.accent ? 1760 : 1100, 0.04, time);
    }
  }

  async play(song: Arrangement, fromBeat: number) {
    await this.init();
    this.load(song);
    const start = fromBeat >= totalBeats(song) ? 0 : fromBeat;
    this.transport.start("+0.05", `${this.ticks(start)}i`);
  }

  stop() {
    if (!this.ready) return;
    this.transport.stop();
    this.pad.releaseAll();
    this.bass.triggerRelease();
    this.lead.triggerRelease();
  }

  get playing() {
    return this.ready && this.transport.state === "started";
  }

  /** Current position in beats. */
  get position() {
    return this.ready ? this.transport.ticks / this.ppq : 0;
  }

  async previewChord(c: ChordSpec, key: number, mode: Mode) {
    await this.init();
    const { notes, bass } = chordMidi(c, key, mode);
    const t = this.previewTime();
    this.pad.triggerAttackRelease(notes.map(midiToFreq), 0.9, t);
    this.bass.triggerAttackRelease(midiToFreq(bass), 0.9, t);
  }

  async previewNote(midi: number) {
    await this.init();
    this.lead.triggerAttackRelease(midiToFreq(midi), 0.35, this.previewTime());
  }
}

export const engine = new Engine();
