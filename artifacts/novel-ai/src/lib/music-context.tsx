import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";
import { loadPlaylist, savePlaylist, type Track } from "./music-store";

interface MusicContextType {
  playlist: Track[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  currentTrack: Track | null;
  play: (index?: number) => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  seek: (pct: number) => void;
  addTrack: (t: Omit<Track, "id">) => void;
  addTrackFile: (file: File) => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, patch: Partial<Pick<Track, "title" | "artist">>) => void;
  reattachFile: (id: string, file: File) => void;
  setPlaylist: (tracks: Track[]) => void;
}

const MusicCtx = createContext<MusicContextType | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [playlist, setPlaylistState] = useState<Track[]>(() => loadPlaylist());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.6);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Refs — always have the latest values without stale closures
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playlistRef = useRef<Track[]>(playlist);
  const currentIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  // Keep refs in sync with state
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => setProgress(audio.currentTime));
    audio.addEventListener("durationchange", () => setDuration(audio.duration || 0));
    audio.addEventListener("ended", () => {
      const pl = playlistRef.current;
      const nextIdx = (currentIndexRef.current + 1) % Math.max(1, pl.length);
      const nextTrack = pl[nextIdx];
      if (!nextTrack) return;
      const url = nextTrack.isFile ? blobUrlsRef.current.get(nextTrack.id) : nextTrack.url;
      if (url) {
        audio.src = url;
        audio.load();
        audio.play().then(() => { setIsPlaying(true); isPlayingRef.current = true; }).catch(() => {});
      }
      setCurrentIndex(nextIdx);
      currentIndexRef.current = nextIdx;
    });

    return () => {
      audio.pause();
      audio.src = "";
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const getTrackUrl = useCallback((track: Track): string => {
    if (track.isFile) return blobUrlsRef.current.get(track.id) || "";
    return track.url;
  }, []);

  const currentTrack = playlist[currentIndex] ?? null;

  // Core play function — always loads src if needed
  const play = useCallback((index?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const pl = playlistRef.current;
    const targetIdx = index !== undefined ? index : currentIndexRef.current;
    const track = pl[targetIdx];
    if (!track) return;

    const url = track.isFile ? blobUrlsRef.current.get(track.id) : track.url;
    if (!url) return; // file track without blob URL

    // Update index state if changing track
    if (targetIdx !== currentIndexRef.current) {
      setCurrentIndex(targetIdx);
      currentIndexRef.current = targetIdx;
    }

    // Load src if different
    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }

    audio.play()
      .then(() => { setIsPlaying(true); isPlayingRef.current = true; })
      .catch((err) => console.error("Play failed:", err));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) pause();
    else play();
  }, [play, pause]);

  const next = useCallback(() => {
    const pl = playlistRef.current;
    const newIdx = (currentIndexRef.current + 1) % Math.max(1, pl.length);
    play(newIdx);
  }, [play]);

  const prev = useCallback(() => {
    const pl = playlistRef.current;
    const newIdx = (currentIndexRef.current - 1 + Math.max(1, pl.length)) % Math.max(1, pl.length);
    play(newIdx);
  }, [play]);

  const setVolume = useCallback((v: number) => setVolumeState(Math.max(0, Math.min(1, v))), []);

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (audio && audio.duration > 0) audio.currentTime = (pct / 100) * audio.duration;
  }, []);

  const addTrack = useCallback((t: Omit<Track, "id">) => {
    const track: Track = { ...t, id: Date.now().toString() };
    setPlaylistState(prev => {
      const next = [...prev, track];
      playlistRef.current = next;
      savePlaylist(next);
      return next;
    });
  }, []);

  const addTrackFile = useCallback((file: File) => {
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const blobUrl = URL.createObjectURL(file);
    blobUrlsRef.current.set(id, blobUrl);
    const track: Track = {
      id, title: file.name.replace(/\.[^.]+$/, ""),
      artist: "Local File", url: "", isFile: true, fileName: file.name,
    };
    setPlaylistState(prev => {
      const next = [...prev, track];
      playlistRef.current = next;
      savePlaylist(next);
      return next;
    });
  }, []);

  const removeTrack = useCallback((id: string) => {
    const blobUrl = blobUrlsRef.current.get(id);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrlsRef.current.delete(id); }
    setPlaylistState(prev => {
      const next = prev.filter(t => t.id !== id);
      playlistRef.current = next;
      savePlaylist(next);
      return next;
    });
  }, []);

  const updateTrack = useCallback((id: string, patch: Partial<Pick<Track, "title" | "artist">>) => {
    setPlaylistState(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch } : t);
      playlistRef.current = next;
      savePlaylist(next);
      return next;
    });
  }, []);

  const reattachFile = useCallback((id: string, file: File) => {
    const old = blobUrlsRef.current.get(id);
    if (old) URL.revokeObjectURL(old);
    const blobUrl = URL.createObjectURL(file);
    blobUrlsRef.current.set(id, blobUrl);
    setPlaylistState(prev => prev.map(t => t.id === id ? { ...t, fileName: file.name } : t));
  }, []);

  const setPlaylist = useCallback((tracks: Track[]) => {
    setPlaylistState(tracks);
    playlistRef.current = tracks;
    savePlaylist(tracks);
  }, []);

  return (
    <MusicCtx.Provider value={{
      playlist, currentIndex, isPlaying, volume, progress, duration, currentTrack,
      play, pause, toggle, next, prev, setVolume, seek,
      addTrack, addTrackFile, removeTrack, updateTrack, reattachFile, setPlaylist,
    }}>
      {children}
    </MusicCtx.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error("useMusic must be used inside MusicProvider");
  return ctx;
}
