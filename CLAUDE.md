# Stepwise

A loop-first songwriting sketchpad for electronic music. Chords are stored as scale degrees (Roman numerals), so changing key or mode transposes everything. The goal is fast inspiration for people with little music theory, quicker and more playful than sketching in a DAW. Finished ideas go to your DAW as MIDI.

**Read first:** [docs/roadmap.md](docs/roadmap.md) for the plan, phases, audience and principles. Musical background is in [docs/research/](docs/research/).

## Who it's for
A drummer and percussionist with little theory who plays a bit of piano and handpan, making melodic techno, trance and organic house. Later, other beginner electronic producers. Explain things in plain words: "darker", "lift", "tension" rather than theory terms, with numerals as optional labels.

## Principles
- **Loop first.** A 4- or 8-bar loop is always playing; arrangement comes later.
- **Chords drive the four layers.** Pads, arp and bass follow the chords; only the melody is written by hand.
- **Hear before you commit.** Suggestions are previews until the user accepts them; nothing writes into the song on its own.
- **Phone first.** It must work well on a phone (touch, small screens, iOS audio quirks); desktop gets more room.
- **Our own UX.** Don't copy other music apps' screens or flows.

## Stack
- React 19 + TypeScript, built with Vite.
- Tone.js for audio.
- Vitest for tests.
- **Design system: shadcn/ui + Tailwind** (decided 2026-11-21, being set up in Phase 0). Use design tokens for every colour, type, spacing and radius value. No one-off hex values or magic numbers once tokens exist.

## Commands
```bash
npm start             # dev server, http://localhost:5173
npm start -- --host   # also on the local network, for testing on a phone
npm test              # unit tests
npm run typecheck
npm run build
```

## Code map
| Path | What it does |
| --- | --- |
| `src/lib/theory.ts` | Modes, chord building (incl. applied chords), numerals and names, pitch math |
| `src/lib/song.ts` | Song model, defaults, normalising saved songs |
| `src/lib/arrange.ts` | Turns chords into what the accompaniment plays (play styles, mixer defaults) |
| `src/lib/audio.ts` | Tone.js engine: instruments, scheduling, previews |
| `src/lib/midi.ts` | Standard MIDI File export |
| `src/lib/files.ts` | Downloads, file import, localStorage |
| `src/state.ts` | Editor reducer with undo/redo |
| `src/components/` | UI: transport, timeline, chord palette, melody and sound panels |

## Rules
- **No third-party names in the repo.** No artist, track, label, music-software (DAWs, other music apps) or music-theory-site names anywhere: code, docs, commit messages, branch names, PR text. Say "your DAW", "existing tools" and so on. Naming our own tech dependencies (React, Vite, Tone.js, Tailwind, shadcn/ui) is fine. Describe musical patterns as genre conventions and use our own code names (the progression library uses names like "Anthem", "Campfire", "Hypnotic"). Never copy real songs' melodies or lyrics, and never scrape or download audio.
- **Git:** `main` is protected. Work on a branch, open a PR, and CI ("Typecheck, test, build") must pass. Merge with a merge commit. Don't force-push `main`.
- **Commit identity:** commits use the repo-local GitHub noreply address; never put a personal email in commits.
- **Before a PR:** `npm run typecheck && npm test && npm run build`, and check UI changes in the browser, including a phone-sized viewport.
- Keep the reducer pure and tested; add tests for theory, state and arrangement logic.
