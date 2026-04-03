import { useState, useRef } from "react";
import { Plus, Trash2, Play, Music2, Upload, X, Edit2, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { useMusic } from "@/lib/music-context";
import { motion, AnimatePresence } from "framer-motion";

export default function MusicPage() {
  const {
    playlist, currentTrack, isPlaying, play, removeTrack, addTrackFile,
    updateTrack, reattachFile,
  } = useMusic();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reattachInputsRef = useRef<Map<string, HTMLInputElement>>(new Map());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editArtist, setEditArtist] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/flac", "audio/aac", "audio/m4a", "audio/mp4"];
    Array.from(files).forEach(file => {
      if (AUDIO_TYPES.includes(file.type) || file.name.match(/\.(mp3|ogg|wav|flac|aac|m4a)$/i)) {
        addTrackFile(file);
      }
    });
  };

  const startEdit = (track: typeof playlist[0]) => {
    setEditingId(track.id);
    setEditTitle(track.title);
    setEditArtist(track.artist || "");
  };

  const confirmEdit = (id: string) => {
    updateTrack(id, { title: editTitle.trim() || "Untitled", artist: editArtist.trim() || undefined });
    setEditingId(null);
  };

  const handleReattach = (trackId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    reattachFile(trackId, files[0]);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
            ᛗ
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif">Music Library</h1>
            <p className="text-sm text-muted-foreground">{playlist.length} tracks · Mystical ambiance</p>
          </div>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Upload className="w-4 h-4" /> Upload Musik
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.ogg,.wav,.flac,.aac,.m4a"
          multiple
          className="hidden"
          onChange={e => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Drop Zone */}
      <motion.div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files); }}
        animate={dragOver ? { scale: 1.01 } : { scale: 1 }}
        className={`mb-6 border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className={`w-8 h-8 mx-auto mb-2 ${dragOver ? "text-primary" : "text-muted-foreground/50"}`} />
        <p className="text-sm text-muted-foreground">
          Drag & drop file audio di sini, atau <span className="text-primary font-medium">klik untuk pilih</span>
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">MP3, OGG, WAV, FLAC, AAC, M4A</p>
      </motion.div>

      {/* Track List */}
      <div className="space-y-2">
        {playlist.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Music2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada track. Upload file audio untuk memulai.</p>
          </div>
        ) : (
          playlist.map((track, idx) => {
            const active = currentTrack?.id === track.id;
            const isEditing = editingId === track.id;
            const needsReattach = track.isFile && !track.url;

            return (
              <motion.div
                key={track.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className={`rounded-xl border transition-all ${
                  active ? "border-violet-500/40 bg-violet-500/5" : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-3 p-3.5">
                  {/* Play button */}
                  <button
                    onClick={() => !needsReattach && play(idx)}
                    disabled={needsReattach}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm transition-all ${
                      needsReattach ? "bg-muted text-muted-foreground/30 cursor-not-allowed"
                      : active ? "text-white" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                    style={active && !needsReattach ? {
                      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                      boxShadow: isPlaying ? "0 0 12px rgba(139,92,246,0.5)" : undefined,
                    } : {}}
                  >
                    {active && isPlaying ? <span className="text-xs animate-pulse">♪</span> : <Play className="w-3.5 h-3.5" />}
                  </button>

                  {/* Track info / edit form */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          placeholder="Judul track"
                          className="w-full px-2 py-1 rounded-lg bg-background border border-primary text-sm focus:outline-none"
                          onKeyDown={e => { if (e.key === "Enter") confirmEdit(track.id); if (e.key === "Escape") setEditingId(null); }}
                        />
                        <input
                          value={editArtist}
                          onChange={e => setEditArtist(e.target.value)}
                          placeholder="Artis (opsional)"
                          className="w-full px-2 py-1 rounded-lg bg-background border border-border text-xs focus:outline-none"
                          onKeyDown={e => { if (e.key === "Enter") confirmEdit(track.id); if (e.key === "Escape") setEditingId(null); }}
                        />
                      </div>
                    ) : (
                      <>
                        <div className={`font-medium text-sm truncate ${active ? "text-violet-300" : ""}`}>
                          {track.title}
                          {track.isFile && (
                            <span className="ml-1.5 text-xs text-muted-foreground/50">📁</span>
                          )}
                        </div>
                        {track.artist && <div className="text-xs text-muted-foreground truncate">{track.artist}</div>}
                        {needsReattach && (
                          <div className="flex items-center gap-1 text-xs text-amber-500/80 mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Perlu re-upload setelah refresh
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Track number */}
                  {!isEditing && (
                    <span className="text-xs text-muted-foreground/40 tabular-nums shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => confirmEdit(track.id)} className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        {needsReattach && (
                          <>
                            <button
                              onClick={() => {
                                const input = reattachInputsRef.current.get(track.id);
                                if (input) input.click();
                              }}
                              className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                              title="Re-upload file"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <input
                              ref={el => { if (el) reattachInputsRef.current.set(track.id, el); }}
                              type="file"
                              accept="audio/*"
                              className="hidden"
                              onChange={e => handleReattach(track.id, e.target.files)}
                            />
                          </>
                        )}
                        <button onClick={() => startEdit(track)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeTrack(track.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="text-center mt-10 text-muted-foreground/20 text-xs tracking-[0.6em] select-none">
        ᛗ ᚢ ᛊ ᛁ ᚲ ᛗ ᚢ ᛊ ᛁ ᚲ
      </div>
    </div>
  );
}
