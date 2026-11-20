import { melodyMidi } from "./theory";
import { arrangeChords } from "./arrange";
import type { Song } from "./song";

const PPQ = 480;

function varLen(n: number): number[] {
  const bytes = [n & 0x7f];
  while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
}

const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const u16 = (n: number) => [(n >>> 8) & 0xff, n & 0xff];
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0) & 0x7f);

interface Ev { tick: number; data: number[]; order: number }

function track(name: string, events: Ev[]): number[] {
  const meta: Ev[] = [{ tick: 0, order: -1, data: [0xff, 0x03, ...varLen(name.length), ...ascii(name)] }];
  // Note-offs (order 0) before note-ons (order 1) at the same tick.
  const all = [...meta, ...events].sort((a, b) => a.tick - b.tick || a.order - b.order);
  const body: number[] = [];
  let last = 0;
  for (const e of all) {
    body.push(...varLen(e.tick - last), ...e.data);
    last = e.tick;
  }
  body.push(0, 0xff, 0x2f, 0x00);
  return [...ascii("MTrk"), ...u32(body.length), ...body];
}

function noteEvents(ch: number, midi: number, start: number, dur: number, vel: number): Ev[] {
  const on = Math.round(start * PPQ);
  const off = Math.round((start + dur) * PPQ);
  return [
    { tick: on, order: 1, data: [0x90 | ch, midi, vel] },
    { tick: off, order: 0, data: [0x80 | ch, midi, 0] },
  ];
}

/** Builds a type-1 Standard MIDI File: tempo track, chords, bass, melody. */
export function songToMidi(song: Song): Uint8Array {
  const usPerBeat = Math.round(60_000_000 / song.bpm);
  const tempo: Ev[] = [
    { tick: 0, order: 0, data: [0xff, 0x51, 0x03, (usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff] },
    { tick: 0, order: 0, data: [0xff, 0x58, 0x04, song.beatsPerBar, 2, 24, 8] },
  ];
  const arranged = arrangeChords(song);
  const chords = arranged.pad.flatMap((h) => h.notes.flatMap((n) => noteEvents(0, n, h.start, h.dur, 80)));
  const bass = arranged.bass.flatMap((h) => noteEvents(1, h.notes[0], h.start, h.dur, 90));
  const melody = song.notes.flatMap((n) =>
    noteEvents(2, melodyMidi(n.step, n.acc, song.key, song.mode), n.start, n.dur, 100),
  );

  const tracks = [track(song.title || "Stepwise", tempo), track("Chords", chords), track("Bass", bass), track("Melody", melody)];
  const header = [...ascii("MThd"), ...u32(6), ...u16(1), ...u16(tracks.length), ...u16(PPQ)];
  return new Uint8Array([...header, ...tracks.flat()]);
}
