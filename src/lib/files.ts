import { songToMidi } from "./midi";
import { isSong, normalizeSong, type Song } from "./song";

function download(data: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "song";

export const exportMidi = (song: Song) =>
  download(songToMidi(song) as BlobPart, "audio/midi", `${slug(song.title)}.mid`);

export const exportJson = (song: Song) =>
  download(JSON.stringify(song, null, 2), "application/json", `${slug(song.title)}.stepwise.json`);

export async function readSongFile(file: File): Promise<Song> {
  const data: unknown = JSON.parse(await file.text());
  if (!isSong(data)) throw new Error("That file isn't a Stepwise song.");
  return normalizeSong(data);
}

const STORE = "stepwise-song-v1";

export function loadSaved(): Song | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORE) ?? "null");
    return isSong(data) ? normalizeSong(data) : null;
  } catch {
    return null;
  }
}

export function saveSong(song: Song) {
  try {
    localStorage.setItem(STORE, JSON.stringify(song));
  } catch {
    /* storage full or blocked: nothing to do */
  }
}
