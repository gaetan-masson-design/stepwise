/** Default names for the 12 pitch classes, used only where no key context exists. */
export const NOTE_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];

export const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
} as const;
export type Mode = keyof typeof MODES;

export const MODE_LABEL: Record<Mode, string> = {
  major: "Major",
  minor: "Minor",
  dorian: "Dorian",
  mixolydian: "Mixolydian",
  lydian: "Lydian",
  phrygian: "Phrygian",
};

/** The key that "Borrowed" chords are taken from. */
export const PARALLEL: Record<Mode, Mode> = {
  major: "minor",
  minor: "major",
  dorian: "major",
  mixolydian: "minor",
  lydian: "minor",
  phrygian: "major",
};

/** Scale steps stacked above the chord root for each chord type. */
export const CHORD_TYPES = {
  triad: [0, 2, 4],
  seventh: [0, 2, 4, 6],
  sus2: [0, 1, 4],
  sus4: [0, 3, 4],
  add9: [0, 2, 4, 8],
} as const;
export type ChordType = keyof typeof CHORD_TYPES;

export const CHORD_TYPE_LABEL: Record<ChordType, string> = {
  triad: "Triad",
  seventh: "7th",
  sus2: "sus2",
  sus4: "sus4",
  add9: "add9",
};

/** Common next chords by scale degree, for the "likely next" hint. */
export const LIKELY_NEXT: Record<number, number[]> = {
  1: [4, 5, 6],
  2: [5, 4, 7],
  3: [6, 4],
  4: [5, 1, 2],
  5: [1, 6, 4],
  6: [4, 2, 5],
  7: [1, 3],
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

export const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Semitones above the tonic for a diatonic step (may be negative or above an octave). */
export const stepToSemitone = (scale: readonly number[], step: number) =>
  scale[mod(step, 7)] + 12 * Math.floor(step / 7);

// --- Spelling -------------------------------------------------------------
// Names come from a letter (C D E F G A B = 0..6) plus however many sharps or flats
// reach the pitch. Each scale degree gets its own letter, so a raised 5th in C is G♯, not A♭.

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

/** Accidental (in semitones, -2..2) that turns `letter` into pitch class `pc`. */
const accidentalFor = (letter: number, pc: number) => mod(pc - LETTER_PC[mod(letter, 7)] + 6, 12) - 6;

const accidentalText = (n: number) => (n > 0 ? "♯".repeat(n) : "♭".repeat(-n));

/**
 * The letter and accidental for pitch class `pc` written on `letter`. Double sharps and flats are
 * hard to read, so those move to the neighbouring letter (B𝄫 becomes A, C𝄪 becomes D).
 */
function spelling(letter: number, pc: number) {
  let acc = accidentalFor(letter, pc);
  if (Math.abs(acc) > 1) {
    letter += Math.sign(acc);
    acc = accidentalFor(letter, pc);
  }
  return { letter, acc };
}

/** Name of pitch class `pc` (absolute, C = 0) written on `letter`, or its neighbour for doubles. */
export const spell = (letter: number, pc: number) => {
  const s = spelling(letter, pc);
  return LETTERS[mod(s.letter, 7)] + accidentalText(s.acc);
};

/**
 * The letter of the tonic for a key (0..11, C = 0) in a mode: the spelling whose scale needs
 * the fewest sharps and flats (C♯ minor rather than D♭ minor). Ties go to the usual flat names.
 */
export function tonicLetter(key: number, mode: Mode): number {
  const scale = MODES[mode];
  let best = -1, bestCost = Infinity;
  for (let letter = 0; letter < 7; letter++) {
    const acc = accidentalFor(letter, key);
    if (Math.abs(acc) > 1) continue;
    const accs = scale.map((s, i) => accidentalFor(letter + i, key + s));
    if (accs.some((a) => Math.abs(a) > 1)) continue;
    // Mixed sharps and flats in one scale count extra.
    const mixed = accs.some((a) => a > 0) && accs.some((a) => a < 0) ? 7 : 0;
    const cost = accs.reduce((n, a) => n + Math.abs(a), 0) + mixed + (spell(letter, key) === NOTE_NAMES[mod(key, 12)] ? -0.5 : 0);
    if (cost < bestCost) [best, bestCost] = [letter, cost];
  }
  return best < 0 ? LETTERS.indexOf(NOTE_NAMES[mod(key, 12)][0]) : best;
}

/** The tonic's name, e.g. "C♯" for key 1 in minor, "D♭" in major. */
export const keyName = (key: number, mode: Mode) => spell(tonicLetter(key, mode), key);

/** Name of a melody step (diatonic steps from the tonic) with an accidental, in a key. */
export const stepName = (step: number, acc: number, key: number, mode: Mode) =>
  spell(tonicLetter(key, mode) + step, key + stepToSemitone(MODES[mode], step) + acc);

/** Scientific pitch name, e.g. "G♯4" or "C♭5": the octave follows the letter, not the key on a piano. */
export function stepPitchName(step: number, acc: number, key: number, mode: Mode) {
  const midi = melodyMidi(step, acc, key, mode);
  const sp = spelling(tonicLetter(key, mode) + step, midi);
  return LETTERS[mod(sp.letter, 7)] + accidentalText(sp.acc) + (Math.floor((midi - sp.acc) / 12) - 1);
}

export const maxInversion = (type: ChordType) => (type === "seventh" ? 3 : 2);

export interface ChordSpec {
  degree: number; // 1..7
  type: ChordType;
  inv: number;
  borrowed: boolean;
  /** Applied (secondary) chord: the degree it tonicizes, 2..7. 0 or missing = none. */
  applied?: number;
}

export interface ChordAnalysis {
  /** Roman numeral with accidental, e.g. "♭VI", "vii". */
  numeral: string;
  /** Superscript part, e.g. "°", "6/5", "Δ7", "sus4". */
  sup: string;
  /** Applied target, e.g. "/V". Empty for ordinary chords. */
  target: string;
  /** Lead-sheet name, e.g. "G7/B", spelled for the key ("G♯dim7", not "A♭dim7", for vii°7/vi in C). */
  name: string;
  /** Chord tone names, lowest voiced first. */
  noteNames: string[];
  /** Voiced chord tones in semitones above the tonic, lowest first. */
  voiced: number[];
  /** Pitch classes (relative to tonic) of the chord. */
  pitchClasses: Set<number>;
}

/** Harmonic minor: the local scale for chords applied to a minor target, so V/ii is major and vii°7/ii fully diminished. */
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11] as const;

type Quality = "maj" | "min" | "dim" | "aug";

function triadQuality(scale: readonly number[], d: number): Quality {
  const root = stepToSemitone(scale, d);
  const third = stepToSemitone(scale, d + 2) - root;
  const fifth = stepToSemitone(scale, d + 4) - root;
  return third === 4 ? (fifth === 8 ? "aug" : "maj") : fifth === 6 ? "dim" : "min";
}

/** A degree can be tonicized when its triad is major or minor. */
export function canTonicize(target: number, mode: Mode, borrowed = false) {
  if (target < 2 || target > 7) return false;
  const q = triadQuality(MODES[borrowed ? PARALLEL[mode] : mode], target - 1);
  return q === "maj" || q === "min";
}

export function analyzeChord(c: ChordSpec, key: number, mode: Mode): ChordAnalysis {
  const host = MODES[c.borrowed ? PARALLEL[mode] : mode];
  const applied = c.applied && c.applied >= 2 && c.applied <= 7 ? c.applied : 0;
  // For applied chords, build the chord in the target's own key, then shift it up to the target's root.
  const scale: readonly number[] = applied ? (triadQuality(host, applied - 1) === "maj" ? MODES.major : HARMONIC_MINOR) : host;
  const offset = applied ? stepToSemitone(host, applied - 1) : 0;
  const d = c.degree - 1;
  const local = stepToSemitone(scale, d);
  const quality = triadQuality(scale, d);
  const seventh = stepToSemitone(scale, d + 6) - local;
  // Keep applied chords in the same register as the rest.
  const shift = offset + local >= 12 ? offset - 12 : offset;
  const root = local + shift;

  // Letters: the chord root sits on its scale degree's letter (counted from the target's root for
  // applied chords), and each chord tone on the letter its scale step lands on.
  const rootLetter = tonicLetter(key, mode) + (applied ? applied - 1 : 0) + d;
  const built = CHORD_TYPES[c.type]
    .map((s) => ({ semi: stepToSemitone(scale, d + s) + shift, letter: rootLetter + s }))
    .sort((a, b) => a.semi - b.semi);
  const tones = built.map((t) => t.semi);
  const inv = Math.min(c.inv, maxInversion(c.type));
  const voicedTones = built.slice();
  for (let i = 0; i < inv; i++) {
    const t = voicedTones.shift()!;
    voicedTones.push({ ...t, semi: t.semi + 12 });
  }
  const voiced = voicedTones.map((t) => t.semi);

  const diff = applied ? 0 : mod(root - MODES[mode][d] + 6, 12) - 6;
  const accidental = diff < 0 ? "♭".repeat(-diff) : "♯".repeat(diff);
  const isSus = c.type === "sus2" || c.type === "sus4";
  const upper = quality === "maj" || quality === "aug" || isSus;
  const base = upper ? ROMAN[d] : ROMAN[d].toLowerCase();
  const qualitySym = quality === "dim" ? "°" : quality === "aug" ? "+" : "";
  const qualityName = { maj: "", min: "m", dim: "dim", aug: "+" }[quality];
  const triadFig = ["", "6", "6/4"][inv];

  let name = spell(rootLetter, root + key);
  let sup = "";
  switch (c.type) {
    case "triad":
      sup = qualitySym + triadFig;
      name += qualityName;
      break;
    case "seventh": {
      let sym: string, suffix: string;
      if (quality === "maj") [sym, suffix] = seventh === 11 ? ["Δ", "maj7"] : ["", "7"];
      else if (quality === "min") [sym, suffix] = seventh === 11 ? ["mΔ", "m(maj7)"] : ["", "m7"];
      else if (quality === "dim") [sym, suffix] = seventh === 10 ? ["ø", "m7♭5"] : ["°", "dim7"];
      else [sym, suffix] = seventh === 11 ? ["+Δ", "maj7♯5"] : ["+", "7♯5"];
      sup = sym + ["7", "6/5", "4/3", "4/2"][inv];
      name += suffix;
      break;
    }
    case "sus2":
    case "sus4":
      sup = c.type + triadFig;
      name += c.type;
      break;
    case "add9":
      sup = qualitySym + "add9";
      name += qualityName + "add9";
      break;
  }
  if (inv > 0) name += "/" + spell(voicedTones[0].letter, voicedTones[0].semi + key);

  const target = applied
    ? "/" + analyzeChord({ degree: applied, type: "triad", inv: 0, borrowed: c.borrowed }, key, mode).numeral
    : "";

  return {
    numeral: accidental + base,
    sup,
    target,
    name,
    voiced,
    noteNames: voicedTones.map((t) => spell(t.letter, t.semi + key)),
    pitchClasses: new Set(tones.map((t) => mod(t, 12))),
  };
}

/** Puts the tonic between F♯ and F so voicings stay in a comfortable range. */
export const keyOffset = (key: number) => (key >= 6 ? key - 12 : key);

export const melodyMidi = (step: number, acc: number, key: number, mode: Mode) =>
  60 + keyOffset(key) + stepToSemitone(MODES[mode], step) + acc;

export function chordMidi(c: ChordSpec, key: number, mode: Mode) {
  const a = analyzeChord(c, key, mode);
  const base = 48 + keyOffset(key);
  return { notes: a.voiced.map((n) => base + n), bass: base + a.voiced[0] - 12 };
}

export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
