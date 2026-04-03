const KEY = "novel-ai-playlist-v2";

export interface Track {
  id: string;
  title: string;
  artist?: string;
  url: string;         // blob: URL for uploaded files, https: for streaming
  isFile?: boolean;    // true if uploaded from local file
  fileName?: string;   // original filename
}

export const DEFAULT_TRACKS: Track[] = [
  { id: "default-1", title: "Ambient Mystical", artist: "Ambiance", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "default-2", title: "Dark Fantasy", artist: "Ambiance", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "default-3", title: "Epic Journey", artist: "Ambiance", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
];

export function loadPlaylist(): Track[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...DEFAULT_TRACKS];
    const stored = JSON.parse(raw) as Track[];
    // Filter out any blob URLs from previous session (they're invalid after refresh)
    const filtered = stored.map(t => t.isFile ? { ...t, url: "" } : t);
    return filtered.length > 0 ? filtered : [...DEFAULT_TRACKS];
  } catch {
    return [...DEFAULT_TRACKS];
  }
}

export function savePlaylist(tracks: Track[]) {
  try {
    // Don't persist blob URLs — save without them; reload will show "re-upload" state
    const toSave = tracks.map(t => t.isFile ? { ...t, url: "" } : t);
    localStorage.setItem(KEY, JSON.stringify(toSave));
  } catch {}
}
