# Stepwise roadmap

Drafted 2026-11-21. It builds on [harmony patterns in electronic music](research/harmony-patterns.md) and the [Organic melodic style profile](research/style-organic-melodic.md).

## Who it's for

**First user:** a drummer and percussionist who plays a little piano and handpan, with no formal theory, producing electronic music (melodic techno, trance, organic house) in a warm, folk-rooted, hypnotic style (see the [Organic melodic profile](research/style-organic-melodic.md)).

**Later users:** other beginner electronic producers, often coming from DJing or rhythm instruments. They can feel what sounds good but can't name chords.

**The job:** get inspired and sketch a catchy loop fast, faster and more playful than sketching in a DAW. Then take it into your DAW to produce.

## Principles
1. **Loop first.** The unit is a 4- or 8-bar loop that is always playing. Song form comes later.
2. **Feel, not theory.** Moods ("darker", "lift", "tension") and sound come first; Roman numerals are optional labels.
3. **Chords drive everything.** Change a chord and the pads, arp and bass follow. Only the melody is written by hand.
4. **Hear before you commit.** Suggestions and variations are previews until you keep them. Nothing writes into the song on its own.
5. **Phone first, desktop roomier.** The same app on both, with large touch targets and no sideways scrolling.
6. **Hand off cleanly.** Each layer exports to your DAW as its own MIDI track.
7. **Our own UX, not existing tools' habits.** No wall of side panels, one way to pick a chord, and tools appear where you're working.

## What the research says matters

**Harmony**
- **Natural minor dominates.** Most loops use only i, VI, III and VII, plus iv and v. 96% of trance loops never leave the key.
- **A few "colour" moves give the magic:**
  - Dorian lift: a major IV.
  - Strong ending: a major V.
  - Suspended and add9 chords.
  - Chords without the 3rd.
- **Chords change slowly:** usually one every 2 bars in an 8-bar loop. Minimal and dub techno often stay on one chord.

**Organic melodic style**
- **Minor, around 122 BPM, 3–4-chord folk-guitar loops** (i–VI–IV, i–♭VII–iv).
- **Melody comes from humming** over the loop.
- **Lyrics are tiny:** 2-word hooks and elemental imagery.
- **Loop first, arrange later.**

**Listening**
- Enjoyment peaks at **moderate** surprise, so suggestions should offer some surprise, but not too much.

**Structure**
- **8/16-bar blocks:** intro → build → breakdown (vocal enters) → drop → outro.
- **The breakdown and the drop usually share the same chords.**

## Phase 0: Foundations
Do this first, because everything else is built on it.
- **Design system.** Set up the design tokens (colour, type, spacing, radius, motion) and core components before adding features. **Decided (2026-11-21): shadcn/ui + Tailwind.** shadcn/ui components are copied into the repo and built on Radix primitives, styled with Tailwind using our tokens. Music-specific parts (chord tiles, layer lanes, note pads) are our own components on the same tokens.
- **Mobile layout shell.**
  - Top: play, key and tempo.
  - Middle: the four layers as stacked lanes covering the whole loop.
  - Bottom: a panel for whichever layer is selected.
  - Desktop: the same layout with side-by-side room.
- **Installable web app (PWA).** Add to home screen, full screen, works offline. Handle iOS audio: it needs a tap to start and is muted by the silent switch.
- **Phone testing over Wi-Fi:** a `--host` dev script.
- **Correct note spelling** (G♯ rather than A♭ where the key calls for it).

## Phase 1: Loop sketchpad (the core)
- **Start screen:** pick a vibe and get a playing loop in one tap. Each vibe sets tempo, mode, a starting progression and sounds:
  - Melodic techno: 124 BPM, i–VI–III–VII, a chord every 2 bars.
  - Organic: 122 BPM, i–VI–IV.
  - Trance: 138 BPM.
  - Hypnotic: one chord.
- **Four layers driven by the chords:**
  - **Pads:** voicing, plus a colour button cycling triad → sus2 → sus4 → add9 → 7th → no-3rd.
  - **Arp:** pattern (up, down, up-down, random), rate and octave range.
  - **Bass:** root, pedal on the home note, offbeat, or rolling 16ths.
  - **Melody:** written by hand (Phase 2 adds helpers).
- **Fast chord trying:** swipe or tap a chord to cycle alternatives while the loop plays. Alternatives come in three tiers (safe / adventurous / spicy), labelled in plain words, using the research's next-chord table.
- **Loop-wide mood moves** ("darker", "brighter", "more tension") that you hear before keeping.
- **Per-layer MIDI export** for your DAW.

## Phase 2: Melody and hooks
- **Note pads:** scale notes as big pads, like a drum pad or handpan, rather than a piano roll. Notes in the current chord are highlighted.
- **Tap a rhythm, then choose pitches:** a drummer-friendly way in.
- **Hook helper:** a one-bar motif repeated over the loop and re-fitted to each chord, plus call/response (the answer an octave away or on another sound).
- **Scales:** the modes plus minor pentatonic for safe melodies. Handpan scales as presets later.
- **Record:** from a MIDI keyboard or the computer keyboard while the loop plays. Then hum-to-melody: sing over the loop and snap it to the scale.

## Phase 3: Words and song
- **Short lyrics** under the melody, one syllable per note. Prompts for a 2–3-word hook repeated 3–4 times.
- **Arrange the loop into a track:** templates in 8/16-bar blocks (Club, Song). Sections reuse the loop by default, so the breakdown and drop share chords.
- **Energy view** across the arrangement.

## Phase 4: Sound and sharing
- **Better sounds:** sampled or warmer instruments per layer, a delay-guitar pluck, simple drum grooves (keep this light; drums are produced in the DAW).
- **Share by link** (song encoded in the URL), audio export of a rough demo, and a printable chord chart.

## Not planned for now
- Stats that need a song database.
- A full mixer with effects.
- Score or guitar-tab views.
- Accounts and a cloud library.
- AI generation.

## Open questions
- **Recheck the progression ranking:** it's an estimate. Checking more loops by ear would firm it up.
- **Sound engine:** how far Tone.js synths go before we need samples.
