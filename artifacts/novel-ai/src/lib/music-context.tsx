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
  removeTrack: (id: string) => void;
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

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.loop = false;
    audioRef.current = audio;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setCurrentIndex(idx => {
        const next = (idx + 1) % (playlist.length || 1);
        audio.src = playlist[next]?.url || "";
        audio.play().catch(() => {});
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
    };
  }, []);

  // Load track when index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || playlist.length === 0) return;
    const track = playlist[currentIndex];
    if (!track) return;
    const wasPlaying = isPlaying;
    audio.src = track.url;
    audio.load();
    if (wasPlaying) audio.play().catch(() => {});
  }, [currentIndex, playlist]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const currentTrack = playlist[currentIndex] ?? null;

  const play = useCallback((index?: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (index !== undefined && index !== currentIndex) {
      setCurrentIndex(index);
      const track = playlist[index];
      if (track) {
        audio.src = track.url;
        audio.load();
      }
    }
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [currentIndex, playlist]);

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
    if (isPlaying) {
      const audio = audioRef.current;
      const track = playlist[newIdx];
      if (audio && track) {
        audio.src = track.url;
        audio.play().catch(() => {});
      }
    }
  }, [currentIndex, playlist, isPlaying]);

  const prev = useCallback(() => {
    const newIdx = (currentIndex - 1 + Math.max(1, playlist.length)) % Math.max(1, playlist.length);
    setCurrentIndex(newIdx);
    if (isPlaying) {
      const audio = audioRef.current;
      const track = playlist[newIdx];
      if (audio && track) {
        audio.src = track.url;
        audio.play().catch(() => {});
      }
    }
  }, [currentIndex, playlist, isPlaying]);

  const setVolume = useCallback((v: number) => setVolumeState(Math.max(0, Math.min(1, v))), []);

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (audio && duration > 0) {
      audio.currentTime = (pct / 100) * duration;
    }
  }, [duration]);

  const addTrack = useCallback((t: Omit<Track, "id">) => {
    const track: Track = { ...t, id: Date.now().toString() };
    setPlaylistState(prev => {
      const next = [...prev, track];
      savePlaylist(next);
      return next;
    });
  }, []);

  const removeTrack = useCallback((id: string) => {
    setPlaylistState(prev => {
      const next = prev.filter(t => t.id !== id);
      savePlaylist(next);
      return next;
    });
  }, []);

  const setPlaylist = useCallback((tracks: Track[]) => {
    setPlaylistState(tracks);
    savePlaylist(tracks);
  }, []);

  return (
    <MusicCtx.Provider value={{
      playlist, currentIndex, isPlaying, volume, progress, duration, currentTrack,
      play, pause, toggle, next, prev, setVolume, seek, addTrack, removeTrack, setPlaylist,
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
