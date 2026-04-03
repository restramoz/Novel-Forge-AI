const KEY = "novel-ai-playlist";

export interface Track {
  id: string;
  title: string;
  artist?: string;
  url: string;
  cover?: string;
}

export const DEFAULT_TRACKS: Track[] = [
  { id: "1", title: "Ambient Mystical", artist: "Ambiance", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "2", title: "Dark Fantasy", artist: "Ambiance", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "3", title: "Epic Journey", artist: "Ambiance", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
];

export function loadPlaylist(): Track[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [...DEFAULT_TRACKS];
    const stored = JSON.parse(raw) as Track[];
    return stored.length > 0 ? stored : [...DEFAULT_TRACKS];
  } catch {
    return [...DEFAULT_TRACKS];
  }
}

export function savePlaylist(tracks: Track[]) {
  try { localStorage.setItem(KEY, JSON.stringify(tracks)); } catch {}
}

export function addTrack(track: Omit<Track, "id">): Track {
  const newTrack: Track = { ...track, id: Date.now().toString() };
  const list = loadPlaylist();
  list.push(newTrack);
  savePlaylist(list);
  return newTrack;
}

export function removeTrack(id: string) {
  const list = loadPlaylist().filter(t => t.id !== id);
  savePlaylist(list);
  return list;
}
