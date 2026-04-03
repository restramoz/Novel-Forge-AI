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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Map of track id → blob URL (for file-based tracks, session-only)
  const blobUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setCurrentIndex(idx => {
        const next = (idx + 1) % Math.max(1, playlist.length);
        const nextTrack = playlist[next];
        const url = nextTrack?.isFile ? blobUrlsRef.current.get(nextTrack.id) : nextTrack?.url;
        if (url) { audio.src = url; audio.play().catch(() => {}); }
        return next;
      });
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      // Revoke all blob URLs
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const getTrackUrl = useCallback((track: Track | null): string => {
    if (!track) return "";
    if (track.isFile) return blobUrlsRef.current.get(track.id) || "";
    return track.url;
  }, []);

  const currentTrack = playlist[currentIndex] ?? null;

  const loadTrack = useCallback((index: number, shouldPlay: boolean) => {
    const audio = audioRef.current;
    const track = playlist[index];
    if (!audio || !track) return;
    const url = getTrackUrl(track);
    if (!url) return; // file track without reattached file
    audio.src = url;
    audio.load();
    if (shouldPlay) audio.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [playlist, getTrackUrl]);

  const play = useCallback((index?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const targetIdx = index ?? currentIndex;
    if (index !== undefined && index !== currentIndex) {
      setCurrentIndex(index);
      loadTrack(index, true);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [currentIndex, loadTrack]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const next = useCallback(() => {
    const newIdx = (currentIndex + 1) % Math.max(1, playlist.length);
    setCurrentIndex(newIdx);
    loadTrack(newIdx, isPlaying);
  }, [currentIndex, playlist.length, isPlaying, loadTrack]);

  const prev = useCallback(() => {
    const newIdx = (currentIndex - 1 + Math.max(1, playlist.length)) % Math.max(1, playlist.length);
    setCurrentIndex(newIdx);
    loadTrack(newIdx, isPlaying);
  }, [currentIndex, playlist.length, isPlaying, loadTrack]);

  const setVolume = useCallback((v: number) => setVolumeState(Math.max(0, Math.min(1, v))), []);

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (audio && duration > 0) audio.currentTime = (pct / 100) * duration;
  }, [duration]);

  const addTrack = useCallback((t: Omit<Track, "id">) => {
    const track: Track = { ...t, id: Date.now().toString() };
    setPlaylistState(prev => {
      const next = [...prev, track];
      savePlaylist(next);
      return next;
    });
  }, []);

  const addTrackFile = useCallback((file: File) => {
    const id = `file-${Date.now()}`;
    const blobUrl = URL.createObjectURL(file);
    blobUrlsRef.current.set(id, blobUrl);
    const track: Track = {
      id,
      title: file.name.replace(/\.[^.]+$/, ""),
      artist: "Local File",
      url: "", // not persisted
      isFile: true,
      fileName: file.name,
    };
    setPlaylistState(prev => {
      const next = [...prev, track];
      savePlaylist(next);
      return next;
    });
  }, []);

  const removeTrack = useCallback((id: string) => {
    // Revoke blob URL if exists
    const blobUrl = blobUrlsRef.current.get(id);
    if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrlsRef.current.delete(id); }
    setPlaylistState(prev => {
      const next = prev.filter(t => t.id !== id);
      savePlaylist(next);
      return next;
    });
  }, []);

  const updateTrack = useCallback((id: string, patch: Partial<Pick<Track, "title" | "artist">>) => {
    setPlaylistState(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch } : t);
      savePlaylist(next);
      return next;
    });
  }, []);

  const reattachFile = useCallback((id: string, file: File) => {
    const blobUrl = URL.createObjectURL(file);
    blobUrlsRef.current.set(id, blobUrl);
    // Force track update so UI re-renders (isFile stays true, url still "")
    setPlaylistState(prev => prev.map(t => t.id === id ? { ...t, fileName: file.name } : t));
  }, []);

  const setPlaylist = useCallback((tracks: Track[]) => {
    setPlaylistState(tracks);
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
