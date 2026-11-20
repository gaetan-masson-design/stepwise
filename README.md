# Stepwise

A songwriting pad built around scale degrees. Write chords by Roman numeral, draw a melody on a grid whose rows are scale degrees, and hear it back. Because everything is stored relative to the key, changing key or mode transposes the whole song.

## Run it

```bash
npm install
npm start        # dev server at http://localhost:5173 (same as npm run dev)
npm test         # unit tests (theory, editing, MIDI export)
npm run build    # production build in dist/
```

## Using it

- **1–7** add a chord at the cursor. Type, inversion, length and "Borrowed" (take the chord from the parallel key) apply to the next chord, or to the selected one.
- **Applied** turns the palette into secondary chords (V/V, vii°7/vi, …) aimed at the chosen degree; the next chord after one suggests its target.
- **Drag** a note or chord to move it; drag its right edge to resize. **Ctrl/Cmd+D** duplicates the selection.
- **Sound** sets how chords play (block, pulse, arpeggio; MIDI export matches) and the chords/bass/melody levels.
- **Click the grid** to add a melody note. Click a note or chord to select it; **Delete** or double-click removes it; **arrow keys** move a selected note.
- **Space** plays/stops. Click the bar numbers to set where playback starts.
- **Ctrl/Cmd+Z** undoes, **Shift+Ctrl/Cmd+Z** (or Ctrl/Cmd+Y) redoes. Songs autosave to the browser; **Save file / Open file** use `.stepwise.json`; **Export MIDI** writes chords, bass and melody as separate tracks.

## Code map

| Path | What it does |
| --- | --- |
| `src/lib/theory.ts` | Modes, chord building, Roman numerals and chord names, pitch math |
| `src/lib/arrange.ts` | Playback styles and mixer defaults: turns chords into what the accompaniment plays |
| `src/lib/song.ts` | Song data model, example song, overlap handling, resizing |
| `src/lib/audio.ts` | Tone.js engine: instruments, Transport scheduling, previews |
| `src/lib/midi.ts` | Standard MIDI File writer |
| `src/lib/files.ts` | Downloads, file import, localStorage |
| `src/state.ts` | Editor reducer with undo history |
| `src/components/` | Transport bar, timeline, chord palette, melody panel |
