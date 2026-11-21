# Stepwise

A loop-first songwriting sketchpad for electronic music, built around scale degrees. Write chords by Roman numeral, draw a melody on a grid whose rows are scale degrees, and hear it back. Because everything is stored relative to the key, changing key or mode transposes the whole song.

## Run it

```bash
npm install
npm start        # dev server at http://localhost:5173 (same as npm run dev)
npm run dev:host # same, but also reachable from your phone on the same Wi-Fi
npm test         # unit tests (theory, spelling, editing, MIDI export)
npm run build    # production build in dist/, with the offline service worker
npm run preview  # serve the production build
```

### Testing on your phone
1. Make sure your phone and computer are on the same Wi-Fi.
2. Run `npm run dev:host`. Vite prints a **Network** address such as `http://192.168.1.20:5173`.
3. Open that address on your phone. Tap anywhere once to wake up the sound.
4. On an iPhone, if you hear nothing, check the silent switch on the side and the volume. The app shows this hint once.

`dev:host` uses plain http, which is fine for checking layout and sound on a phone. Installing the app and offline mode need a secure page, though, and phones don't treat `http://192.168…` as one:

- **On your computer:** run `npm run build && npm run preview`, then open `http://localhost:4173`. Localhost counts as secure, so the browser offers to install the app and it keeps working offline. (The service worker only runs in the production build.)
- **On a phone:** installing ("Add to Home Screen" as a full-screen app that works offline) needs a trusted `https://` address, such as a hosted preview. A self-signed certificate isn't enough, because browsers won't register the service worker on one.

## Using it

The screen has three parts:
- **Top bar:** play, key, tempo and a menu.
- **The loop:** four stacked lanes covering the whole loop: **Pads** (the chords), **Arp**, **Bass** and **Melody**. The whole loop fits the screen; the zoom button (1×, 2×, 4×) in the corner stretches it for detail.
- **The dock:** the tools for whichever lane you tapped. Tap its header to fold it away. Delete, undo and redo are always there.

Tap the Melody lane to open the melody editor at that bar: one or two bars at a time, with rows big enough for a finger. **Done** goes back to the loop.

- **1–7** add a chord at the cursor. Type, inversion, length and "Borrowed" (take the chord from the parallel key) apply to the next chord, or to the selected one.
- **Applied** turns the palette into secondary chords (V/V, vii°7/vi, …) aimed at the chosen degree; the next chord after one suggests its target.
- **Drag** a note or chord to move it; drag its right edge to resize. **Ctrl/Cmd+D** duplicates the selection.
- **Pads** also sets how the chords play (block, pulse, arpeggio; MIDI export matches). Each layer has its own level.
- **Arp** and **Bass** follow the chords. For now the Arp lane previews the arpeggio, and the Bass lane shows what the bass plays; their own patterns come next.
- In the melody editor, **tap the grid** to add a note. Click a note or chord to select it; **Delete** or double-click removes it; **arrow keys** move a selected note.
- **Space** plays/stops. Click the bar numbers to set where playback starts.
- The **menu** (⋮) has song settings (title, loop length), loop and click on/off, export, save/open, the example and the theme.
- **Ctrl/Cmd+Z** undoes, **Shift+Ctrl/Cmd+Z** (or Ctrl/Cmd+Y) redoes. Songs autosave to the browser; **Save file / Open file** use `.stepwise.json`; **Export MIDI** writes chords, bass and melody as separate tracks.

## Code map

| Path | What it does |
| --- | --- |
| `src/lib/theory.ts` | Modes, chord building, Roman numerals, note and chord names spelled for the key, pitch math |
| `src/lib/arrange.ts` | Playback styles and mixer defaults: turns chords into what the accompaniment plays |
| `src/lib/song.ts` | Song data model, example song, overlap handling, resizing |
| `src/lib/audio.ts` | Tone.js engine: instruments, Transport scheduling, previews |
| `src/lib/midi.ts` | Standard MIDI File writer |
| `src/lib/files.ts` | Downloads, file import, localStorage |
| `src/state.ts` | Editor reducer with undo history |
| `src/lib/device.ts`, `src/lib/theme.ts` | iOS audio helpers; light/dark theme |
| `src/styles.css` | Design tokens (colour, type, spacing, radius, motion) and Tailwind setup |
| `src/lib/lanes.ts` | The four layers, fitting the loop to the screen, what the Arp and Bass lanes draw |
| `src/components/` | Top bar, loop view (four lanes), melody editor, layer dock and panels, chord palette, song sheet |
| `src/components/ui/` | shadcn/ui primitives adapted to the tokens |
