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
- Tailwind v4 (via `@tailwindcss/vite`) and shadcn/ui on Radix (`radix-ui`), icons from lucide-react.
- vite-plugin-pwa for the manifest and offline service worker.
- Fonts are self-hosted (Schibsted Grotesk for UI, JetBrains Mono for numbers and note names) so the app works offline.

## Design system
- **Tokens live in `src/styles.css`**: colour (light on `:root`, dark on `[data-theme="dark"]`), the seven scale-degree colours (`--deg-1`…`--deg-7`, used as `bg-deg-3` or via `degreeColor()`), type scale (`text-2xs`…`text-2xl`, `text-figure` for numeral superscripts), spacing (Tailwind's 4px step plus `touch` = 44px), radius (`rounded-xs`…`rounded-xl`), motion (`--duration-fast/base/slow`, zeroed for reduced motion) and safe-area insets (`--safe-top` etc).
- **Use tokens for every colour, size, radius and timing.** No hex, rgb or oklch values, and no arbitrary `[12px]` values in components. If something is missing, add a token.
- **Primitives:** shadcn/ui components are in `src/components/ui/` (button, toggle, toggle group, slider, select, sheet, dropdown menu, input). Add more with `npx shadcn@latest add <name>`, then check the import of `cn` points at `@/lib/utils` and swap any `white`/`black` for tokens. They're ours to edit: on touch screens controls are 44px (`h-touch`), with a compact `pointer-fine:` size for mouse users.
- **Music parts are our own components** on the same tokens: `ChordTile`, `LoopView`, `MelodyEditor`, `RomanNumeral`. Beat width and row height are computed in JS (the drag maths needs them); lane heights use spacing classes.
- **Layout shell (phone first):**
  - `TopBar`: play, key, tempo, and a menu (song settings, loop/click, files, theme).
  - `LoopView`: the loop as four stacked lanes (Pads, Arp, Bass, Melody). At 1× the whole loop fits the width with no sideways scroll; the zoom button (1×/2×/4×) stretches it and the lanes scroll inside the view. Tapping a lane picks that layer.
  - `MelodyEditor`: replaces the loop view while open. It shows the Melody lane zoomed to 1 bar on phones (2 with more room), with 44px rows on touch screens.
  - `LayerDock`: the picked layer's tools, foldable from its header, with delete/undo/redo always in reach.
  - `SongSheet`: title and loop length.
- **Layers** are listed in `src/lib/lanes.ts` (`Layer`, plus what the Arp and Bass lanes draw). Phase 1 gives Arp and Bass their own sounds and patterns; for now Arp previews the arpeggio from the chords and Bass draws what plays.
- **Touch targets:** anything tapped on a phone is at least 44px (`h-touch`, `size-touch`, `min-h-touch`).
- Theme: `src/lib/theme.ts` sets `data-theme` on `<html>`; `index.html` does it before first paint.

## Commands
```bash
npm start             # dev server, http://localhost:5173
npm run dev:host      # also on your Wi-Fi, for testing on a phone (open the "Network" URL it prints)
npm test              # unit tests
npm run typecheck
npm run build         # also builds the service worker; `npm run preview` serves it
npm run icons         # redraws the app icons in public/
```

## Code map
| Path | What it does |
| --- | --- |
| `src/lib/theory.ts` | Modes, chord building (incl. applied chords), numerals, note spelling (`spell`, `keyName`, `stepName`), pitch math |
| `src/lib/song.ts` | Song model, defaults, normalising saved songs |
| `src/lib/arrange.ts` | Turns chords into what the accompaniment plays (play styles, mixer defaults) |
| `src/lib/audio.ts` | Tone.js engine: instruments, scheduling, previews, unlocking audio on the first tap |
| `src/lib/device.ts` | iOS detection and audio-unlock helpers |
| `src/lib/theme.ts` | Light/dark/system theme |
| `src/lib/colors.ts` | Scale-degree colour tokens |
| `src/lib/midi.ts` | Standard MIDI File export |
| `src/lib/files.ts` | Downloads, file import, localStorage |
| `src/state.ts` | Editor reducer with undo/redo |
| `src/lib/lanes.ts` | Layers, fitting the loop to the width, zoom steps, what the Arp/Bass lanes draw |
| `src/hooks/useItemDrag.ts` | Drag to move or resize chords and notes |
| `src/components/` | UI: top bar, loop view (four lanes), melody editor, layer dock and panels, chord palette, song sheet |
| `src/components/ui/` | shadcn/ui primitives, adapted to our tokens |

## Rules
- **No third-party names in the repo.** No artist, track, label, music-software (DAWs, other music apps) or music-theory-site names anywhere: code, docs, commit messages, branch names, PR text. Say "your DAW", "existing tools" and so on. Naming our own tech dependencies (React, Vite, Tone.js, Tailwind, shadcn/ui) is fine. Describe musical patterns as genre conventions and use our own code names (the progression library uses names like "Anthem", "Campfire", "Hypnotic"). Never copy real songs' melodies or lyrics, and never scrape or download audio.
- **Git:** `main` is protected. Work on a branch, open a PR, and CI ("Typecheck, test, build") must pass. Merge with a merge commit. Don't force-push `main`.
- **Commit identity:** commits use the repo-local GitHub noreply address; never put a personal email in commits.
- **Before a PR:** `npm run typecheck && npm test && npm run build`, and check UI changes in the browser at phone size (375×812) and desktop, in light and dark.
- **Note names are spelled from letters, not a fixed list.** Use `spell`/`keyName`/`stepName` from `theory.ts` (G♯ in E major, A♭ in F minor); `NOTE_NAMES` is only a fallback.
- Keep the reducer pure and tested; add tests for theory, state and arrangement logic.
