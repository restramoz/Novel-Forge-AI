import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMusic } from "@/lib/music-context";

// Runic symbols
const RUNE_MUSIC = "ᛗ";
const RUNE_PLAY = "ᚦ";
const RUNE_PAUSE = "ᛉ";
const RUNE_NEXT = "ᛏ";
const RUNE_PREV = "ᚱ";
const RUNE_CLOSE = "ᛜ";

function formatTime(s: number) {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function FloatingMusic() {
  const [open, setOpen] = useState(false);
  const { currentTrack, isPlaying, toggle, next, prev, volume, setVolume, progress, duration, seek, playlist, play } = useMusic();

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-72 rounded-2xl overflow-hidden shadow-2xl border border-violet-500/30"
            style={{
              background: "linear-gradient(135deg, #0f0a1e 0%, #1a0f2e 50%, #0a0a18 100%)",
              boxShadow: "0 0 30px rgba(139,92,246,0.25), 0 0 60px rgba(139,92,246,0.1)",
            }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-violet-500/20">
              <div className="flex items-center gap-2">
                <span className="text-violet-400 text-lg">{RUNE_MUSIC}</span>
                <span className="text-violet-200 text-xs font-medium tracking-widest uppercase">Mystic Tunes</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-violet-400 hover:text-violet-200 text-sm">
                {RUNE_CLOSE}
              </button>
            </div>

            {/* Rune decorations */}
            <div className="px-4 pt-3 pb-1">
              <div className="text-center">
                <div className="text-violet-500/30 text-xs tracking-[0.4em] mb-2 font-mono select-none">
                  ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ
                </div>
                {/* Track name */}
                <div className="truncate text-sm font-semibold text-violet-100 mb-0.5">
                  {currentTrack?.title ?? "No track"}
                </div>
                <div className="text-xs text-violet-400/70 truncate">
                  {currentTrack?.artist ?? "—"}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 mb-2">
                <div
                  className="relative h-1 rounded-full cursor-pointer group"
                  style={{ background: "rgba(139,92,246,0.2)" }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    seek(((e.clientX - rect.left) / rect.width) * 100);
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all"
                    style={{
                      width: `${progressPct}%`,
                      background: "linear-gradient(90deg, #7c3aed, #a855f7)",
                      boxShadow: "0 0 8px rgba(139,92,246,0.6)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-violet-500/60 mt-1">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6 my-2">
                <button
                  onClick={prev}
                  className="text-xl text-violet-400 hover:text-violet-200 hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.8)] transition-all"
                  title="Previous"
                >
                  {RUNE_PREV}
                </button>

                <button
                  onClick={toggle}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl text-white transition-all hover:scale-110"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    boxShadow: isPlaying ? "0 0 16px rgba(139,92,246,0.7)" : "0 0 8px rgba(139,92,246,0.3)",
                  }}
                >
                  {isPlaying ? RUNE_PAUSE : RUNE_PLAY}
                </button>

                <button
                  onClick={next}
                  className="text-xl text-violet-400 hover:text-violet-200 hover:drop-shadow-[0_0_8px_rgba(167,139,250,0.8)] transition-all"
                  title="Next"
                >
                  {RUNE_NEXT}
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-violet-500 w-4">ᚡ</span>
                <input
                  type="range" min="0" max="1" step="0.02"
                  value={volume}
                  onChange={e => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1 rounded-full cursor-pointer"
                  style={{ accentColor: "#a855f7" }}
                />
                <span className="text-xs text-violet-500/60 w-6 text-right">{Math.round(volume * 100)}</span>
              </div>
            </div>

            {/* Playlist */}
            {playlist.length > 0 && (
              <div className="border-t border-violet-500/20 max-h-36 overflow-y-auto">
                {playlist.map((track, idx) => {
                  const active = currentTrack?.id === track.id;
                  return (
                    <button
                      key={track.id}
                      onClick={() => play(idx)}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors ${
                        active
                          ? "bg-violet-500/20 text-violet-200"
                          : "text-violet-400/70 hover:bg-violet-500/10 hover:text-violet-300"
                      }`}
                    >
                      <span className="text-violet-500/50 w-4 shrink-0">{active ? "▶" : (idx + 1)}</span>
                      <span className="truncate">{track.title}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom rune bar */}
            <div className="px-4 py-2 text-center text-violet-500/20 text-xs tracking-[0.5em] select-none border-t border-violet-500/10">
              ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.92 }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center select-none"
        style={{
          background: open
            ? "linear-gradient(135deg, #7c3aed, #a855f7)"
            : "linear-gradient(135deg, #1a0f2e, #2d1b4e)",
          boxShadow: isPlaying
            ? "0 0 20px rgba(139,92,246,0.7), 0 0 40px rgba(139,92,246,0.3)"
            : "0 0 10px rgba(139,92,246,0.3)",
          border: "1px solid rgba(139,92,246,0.4)",
        }}
      >
        {/* Pulsing ring when playing */}
        {isPlaying && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ border: "1px solid rgba(139,92,246,0.6)" }}
          />
        )}
        <span
          className="text-2xl select-none"
          style={{
            color: open || isPlaying ? "#f0e6ff" : "#a78bfa",
            textShadow: isPlaying ? "0 0 12px rgba(167,139,250,0.9)" : "none",
          }}
        >
          {RUNE_MUSIC}
        </span>
      </motion.button>
    </div>
  );
}
