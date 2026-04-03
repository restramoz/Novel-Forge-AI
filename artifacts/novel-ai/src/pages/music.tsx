import { useState } from "react";
import { Plus, Trash2, Play, Music2, Link as LinkIcon, X } from "lucide-react";
import { useMusic } from "@/lib/music-context";
import { motion, AnimatePresence } from "framer-motion";

export default function MusicPage() {
  const { playlist, currentTrack, isPlaying, play, removeTrack, addTrack } = useMusic();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newArtist, setNewArtist] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    addTrack({ title: newTitle.trim(), artist: newArtist.trim() || undefined, url: newUrl.trim() });
    setNewTitle("");
    setNewArtist("");
    setNewUrl("");
    setShowAdd(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
          >
            <span className="text-white text-lg">ᛗ</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif">Music Library</h1>
            <p className="text-sm text-muted-foreground">{playlist.length} tracks · Mystical ambiance</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(o => !o)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Track
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Add New Track</h3>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid gap-3">
                <input
                  placeholder="Track title *"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  placeholder="Artist (optional)"
                  value={newArtist}
                  onChange={e => setNewArtist(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      placeholder="Audio URL (mp3, ogg, wav) *"
                      value={newUrl}
                      onChange={e => setNewUrl(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                    />
                  </div>
                  <button
                    onClick={handleAdd}
                    disabled={!newTitle.trim() || !newUrl.trim()}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist */}
      <div className="space-y-2">
        {playlist.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Music2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No tracks yet. Add some music to start.</p>
          </div>
        ) : (
          playlist.map((track, idx) => {
            const active = currentTrack?.id === track.id;
            return (
              <motion.div
                key={track.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group ${
                  active
                    ? "border-violet-500/40 bg-violet-500/5"
                    : "border-border bg-card hover:border-border/80 hover:bg-card/80"
                }`}
                onClick={() => play(idx)}
              >
                {/* Play indicator */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm transition-all ${
                    active
                      ? "text-white"
                      : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  }`}
                  style={active ? {
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    boxShadow: isPlaying ? "0 0 12px rgba(139,92,246,0.5)" : undefined,
                  } : {}}
                >
                  {active && isPlaying ? (
                    <span className="text-xs animate-pulse">♪</span>
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Track info */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm truncate ${active ? "text-violet-300" : ""}`}>
                    {track.title}
                  </div>
                  {track.artist && (
                    <div className="text-xs text-muted-foreground truncate">{track.artist}</div>
                  )}
                </div>

                {/* Track number */}
                <span className="text-xs text-muted-foreground/50 tabular-nums shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>

                {/* Remove */}
                <button
                  onClick={e => { e.stopPropagation(); removeTrack(track.id); }}
                  className="text-muted-foreground/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Rune footer decoration */}
      <div className="text-center mt-12 text-muted-foreground/20 text-xs tracking-[0.6em] select-none">
        ᛗ ᚢ ᛊ ᛁ ᚲ ᛗ ᚢ ᛊ ᛁ ᚲ
      </div>
    </div>
  );
}
