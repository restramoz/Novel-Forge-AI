import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useGetNovel, useListChapters, useDeleteNovel, getListNovelsQueryKey, getListChaptersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useChapterStream } from "@/hooks/use-stream";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Edit3, Trash2, ArrowLeft, PenTool, Sparkles, Clock, FileText,
  ChevronRight, Loader2, CheckCircle2, BookMarked, ChevronDown, ChevronUp,
  Users, Scroll, Bot, Plus, X, Save, RefreshCw, Wand2, AlertCircle, User
} from "lucide-react";
import { format } from "date-fns";
import { getLastRead, type LastReadInfo } from "@/hooks/use-last-read";
import { loadSettings } from "@/lib/settings-store";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Character = {
  id: number;
  name: string;
  role: string;
  description: string;
  characteristics: string[];
  avatarEmoji: string;
};

type Tab = "bab" | "karakter" | "master";

// ─── Character Card ──────────────────────────────────────────────────────────
function CharacterCard({ char, onDelete, onEdit }: {
  char: Character;
  onDelete: () => void;
  onEdit: (updated: Omit<Character, "id">) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(char.name);
  const [role, setRole] = useState(char.role);
  const [description, setDescription] = useState(char.description);
  const [characteristics, setCharacteristics] = useState(char.characteristics.join(", "));
  const [avatarEmoji, setAvatarEmoji] = useState(char.avatarEmoji);

  const handleSave = () => {
    onEdit({
      name: name.trim() || char.name,
      role,
      description: description.trim(),
      characteristics: characteristics.split(",").map(c => c.trim()).filter(Boolean),
      avatarEmoji: avatarEmoji.trim() || "👤",
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="bg-card border border-primary/40 rounded-2xl p-4 space-y-3"
      >
        <h3 className="font-semibold text-sm text-primary">Edit Karakter</h3>
        <div className="flex gap-2">
          <input placeholder="Emoji" value={avatarEmoji} onChange={e => setAvatarEmoji(e.target.value)}
            className="w-14 px-2 py-2 rounded-lg bg-background border border-border text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <input placeholder="Nama *" value={name} onChange={e => setName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          {["Protagonist", "Antagonist", "Supporting", "Mentor", "Villain"].map(r => <option key={r}>{r}</option>)}
        </select>
        <textarea placeholder="Deskripsi..." value={description} onChange={e => setDescription(e.target.value)} rows={2}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <input placeholder="Karakteristik (pisah koma)" value={characteristics} onChange={e => setCharacteristics(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <div className="flex gap-2">
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Simpan
          </button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            Batal
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2 group relative">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
        <button onClick={() => setEditing(true)} className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-500/10 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-2xl shrink-0">
          {char.avatarEmoji}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{char.name}</div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            char.role === "Protagonist" ? "bg-blue-500/10 text-blue-400" :
            char.role === "Antagonist" ? "bg-red-500/10 text-red-400" :
            char.role === "Villain" ? "bg-orange-500/10 text-orange-400" :
            char.role === "Mentor" ? "bg-green-500/10 text-green-400" :
            "bg-muted text-muted-foreground"
          }`}>
            {char.role}
          </span>
        </div>
      </div>
      {char.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{char.description}</p>
      )}
      {char.characteristics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {char.characteristics.slice(0, 4).map((c, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/5 text-primary/80 border border-primary/10">
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Character Form ──────────────────────────────────────────────────────
function AddCharacterForm({ onAdd, onCancel }: { onAdd: (c: Omit<Character, "id">) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Supporting");
  const [description, setDescription] = useState("");
  const [characteristics, setCharacteristics] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("👤");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      role,
      description: description.trim(),
      characteristics: characteristics.split(",").map(c => c.trim()).filter(Boolean),
      avatarEmoji: avatarEmoji.trim() || "👤",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-5 space-y-3"
    >
      <h3 className="font-semibold text-sm">Tambah Karakter</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex gap-2 col-span-2">
          <input placeholder="Emoji (👤)" value={avatarEmoji} onChange={e => setAvatarEmoji(e.target.value)}
            className="w-16 px-2 py-2 rounded-lg bg-background border border-border text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <input placeholder="Nama *" value={name} onChange={e => setName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)}
          className="col-span-2 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
          {["Protagonist", "Antagonist", "Supporting", "Mentor", "Villain"].map(r => <option key={r}>{r}</option>)}
        </select>
        <textarea placeholder="Deskripsi karakter..." value={description} onChange={e => setDescription(e.target.value)} rows={2}
          className="col-span-2 px-3 py-2 rounded-lg bg-background border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <input placeholder="Karakteristik (pisah koma)" value={characteristics} onChange={e => setCharacteristics(e.target.value)}
          className="col-span-2 px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSubmit} disabled={!name.trim()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          Tambah
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
          Batal
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function NovelDetail() {
  const { id } = useParams();
  const novelId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: novel, isLoading: novelLoading } = useGetNovel(novelId);
  const { data: chaptersData, isLoading: chaptersLoading } = useListChapters(novelId);
  const { mutate: deleteNovel, isPending: isDeleting } = useDeleteNovel();
  const { generate, isGenerating } = useChapterStream(novelId);

  const [tab, setTab] = useState<Tab>("bab");
  const [detailOpen, setDetailOpen] = useState(false);

  const [generateDone, setGenerateDone] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [streamPreview, setStreamPreview] = useState("");

  const [lastRead, setLastRead] = useState<LastReadInfo | null>(null);

  // Custom prompt state
  const [customPrompt, setCustomPrompt] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);

  // Master Concept state
  const [masterConcept, setMasterConcept] = useState("");
  const [savingMaster, setSavingMaster] = useState(false);
  const [masterSaved, setMasterSaved] = useState(false);
  const [generatingMaster, setGeneratingMaster] = useState(false);
  const [masterError, setMasterError] = useState("");

  // Characters state
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charsLoading, setCharsLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [showAddChar, setShowAddChar] = useState(false);

  const chapters = chaptersData?.chapters || [];

  useEffect(() => { setLastRead(getLastRead(novelId)); }, [novelId]);

  useEffect(() => {
    if (!novel) return;
    setCustomPrompt(novel.customPrompt || "");
    setMasterConcept(novel.masterConcept || "");
  }, [novel]);

  // Load characters
  const loadCharacters = useCallback(async () => {
    setCharsLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/novels/${novelId}/characters`);
      const d = await r.json();
      setCharacters(d.characters || []);
    } catch { } finally { setCharsLoading(false); }
  }, [novelId]);

  useEffect(() => { if (tab === "karakter") loadCharacters(); }, [tab, loadCharacters]);

  if (novelLoading) return <div className="p-20 text-center animate-pulse">Memuat...</div>;
  if (!novel) return <div className="p-20 text-center">Novel tidak ditemukan</div>;

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDelete = () => {
    if (confirm("Yakin ingin menghapus novel ini beserta semua babnya?")) {
      deleteNovel({ id: novelId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNovelsQueryKey() });
          setLocation("/");
        }
      });
    }
  };

  const handleGenerate = async () => {
    const settings = loadSettings();
    setGenerateDone(false); setGenerateError(""); setStreamPreview("");
    const result = await generate(
      { model: novel.model, ollamaEndpoint: settings.ollamaEndpoint },
      (chunk) => setStreamPreview(prev => { const n = prev + chunk; return n.length > 600 ? n.slice(-600) : n; })
    );
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(novelId) });
      queryClient.invalidateQueries({ queryKey: ["getNovel", novelId] });
      setGenerateDone(true); setStreamPreview("");
      setTimeout(() => setGenerateDone(false), 4000);
    } else {
      setGenerateError(result.error ?? "Terjadi kesalahan"); setStreamPreview("");
    }
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    await fetch(`${API_BASE}/api/novels/${novelId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customPrompt }),
    });
    setSavingPrompt(false); setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2500);
  };

  const handleSaveMaster = async () => {
    setSavingMaster(true);
    await fetch(`${API_BASE}/api/novels/${novelId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masterConcept }),
    });
    setSavingMaster(false); setMasterSaved(true);
    setTimeout(() => setMasterSaved(false), 2500);
  };

  const handleGenerateMaster = async () => {
    const settings = loadSettings();
    setGeneratingMaster(true); setMasterError("");
    try {
      const resp = await fetch(`${API_BASE}/api/novels/${novelId}/generate-master-concept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ollamaEndpoint: settings.ollamaEndpoint }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setMasterError(data.message || "Gagal generate master concept");
      } else {
        setMasterConcept(data.masterConcept || "");
      }
    } catch (err) {
      setMasterError(String(err));
    } finally {
      setGeneratingMaster(false);
    }
  };

  const handleExtractChars = async () => {
    const settings = loadSettings();
    setExtracting(true); setExtractError("");
    try {
      const r = await fetch(`${API_BASE}/api/novels/${novelId}/characters/extract`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: novel.model, ollamaEndpoint: settings.ollamaEndpoint }),
      });
      if (!r.ok) {
        const e = await r.json();
        setExtractError(e.message || "Gagal mengekstrak karakter");
      } else {
        await loadCharacters();
      }
    } catch (err) { setExtractError(String(err)); }
    finally { setExtracting(false); }
  };

  const handleAddChar = async (c: Omit<Character, "id">) => {
    const r = await fetch(`${API_BASE}/api/novels/${novelId}/characters`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c }),
    });
    const added = await r.json();
    setCharacters(prev => [...prev, added]);
    setShowAddChar(false);
  };

  const handleDeleteChar = async (charId: number) => {
    await fetch(`${API_BASE}/api/novels/${novelId}/characters/${charId}`, { method: "DELETE" });
    setCharacters(prev => prev.filter(c => c.id !== charId));
  };

  const handleEditChar = async (charId: number, updated: Omit<Character, "id">) => {
    const resp = await fetch(`${API_BASE}/api/novels/${novelId}/characters/${charId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updated, characteristics: updated.characteristics }),
    });
    if (resp.ok) {
      const saved = await resp.json() as Character;
      setCharacters(prev => prev.map(c => c.id === charId ? saved : c));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* ── Compact Header ───────────────────────────────────────────────── */}
      <div className="border-b border-border/50 bg-card/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          {/* Back */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Library
          </Link>

          <div className="flex gap-5">
            {/* Cover - compact */}
            <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-xl overflow-hidden shadow-lg shrink-0 border border-border/50">
              <img
                src={novel.coverImage || `${import.meta.env.BASE_URL}images/cover-placeholder.png`}
                alt={novel.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-semibold tracking-wide uppercase">
                  {novel.genre}
                </span>
                <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                  {novel.status.replace("_", " ")}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight leading-tight mb-2 truncate">
                {novel.title}
              </h1>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{novel.chapterCount} Bab</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{novel.wordCount.toLocaleString()} Kata</span>
                <span className="hidden sm:flex items-center gap-1"><Clock className="w-3 h-3" />
                  {format(new Date(novel.updatedAt), "d MMM yyyy")}
                </span>
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-2 flex-wrap">
                {lastRead ? (
                  <Link
                    href={`/novels/${novel.id}/read?resume=1`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-all"
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                    Lanjut Baca · {lastRead.progressPct}%
                  </Link>
                ) : (
                  <Link
                    href={`/novels/${novel.id}/read`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Baca Novel
                  </Link>
                )}

                <Link
                  href={`/novels/${novel.id}/edit`}
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleDelete} disabled={isDeleting}
                  className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Collapse toggle */}
                <button
                  onClick={() => setDetailOpen(o => !o)}
                  className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {detailOpen ? "Sembunyikan" : "Detail"}
                  {detailOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Collapse detail: synopsis, tags, model */}
          <AnimatePresence>
            {detailOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-5 pt-5 border-t border-border/50 space-y-3">
                  {novel.synopsis && (
                    <div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sinopsis</span>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{novel.synopsis}</p>
                    </div>
                  )}
                  {(novel.tags as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(novel.tags as string[]).map((t: string) => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">#{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Bot className="w-3.5 h-3.5" />
                    <span className="font-mono">{novel.model}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Custom Prompt */}
          <div className="mt-4 pt-4 border-t border-border/30">
            <button
              onClick={() => setPromptOpen(o => !o)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bot className="w-3.5 h-3.5" />
              AI Prompt Khusus {customPrompt.trim() && <span className="text-primary">• Aktif</span>}
              {promptOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <AnimatePresence>
              {promptOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={customPrompt}
                      onChange={e => setCustomPrompt(e.target.value)}
                      rows={3}
                      placeholder="Instruksi khusus untuk AI saat generate bab. Contoh: 'Selalu gunakan sudut pandang orang pertama', 'Hindari kekerasan eksplisit'..."
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={handleSavePrompt}
                      disabled={savingPrompt}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        promptSaved ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      {savingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : promptSaved ? <CheckCircle2 className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                      {promptSaved ? "Tersimpan!" : "Simpan Prompt"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="flex border-b border-border mt-0">
          {([
            { id: "bab", label: "Bab", icon: FileText },
            { id: "karakter", label: "Karakter", icon: Users },
            { id: "master", label: "Master Concept", icon: Scroll },
          ] as { id: Tab; label: string; icon: typeof FileText }[]).map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                tab === tid
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: BAB ──────────────────────────────────────────────────── */}
        {tab === "bab" && (
          <div className="py-6 space-y-4">
            {/* Generate bar */}
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-base">
                {chapters.length} Bab{novel.targetChapters && <span className="text-muted-foreground font-normal text-sm"> / {novel.targetChapters} target</span>}
              </h2>
              <div className="flex gap-2">
                <Link
                  href={`/novels/${novel.id}/chapters/new`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5" /> Manual
                </Link>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-70 transition-all"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isGenerating ? "Menulis..." : "Generate Bab"}
                </button>
              </div>
            </div>

            {/* Stream preview + status */}
            <AnimatePresence>
              {(isGenerating || generateDone || generateError) && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {isGenerating && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <span className="text-sm font-semibold text-primary">AI sedang menulis Bab {chapters.length + 1}...</span>
                      </div>
                      {streamPreview && (
                        <p className="text-xs text-muted-foreground font-serif leading-relaxed line-clamp-3 border-t border-border/30 pt-2">
                          {streamPreview}
                        </p>
                      )}
                    </div>
                  )}
                  {generateDone && !isGenerating && (
                    <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">Bab baru berhasil dibuat!</span>
                    </div>
                  )}
                  {generateError && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                      {generateError}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chapter list */}
            {chaptersLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}</div>
            ) : chapters.length > 0 ? (
              <div className="flex flex-col gap-2">
                {chapters.map(chap => {
                  const isLastRead = lastRead?.chapterId === chap.id;
                  return (
                    <Link
                      key={chap.id}
                      href={isLastRead ? `/novels/${novel.id}/read?resume=1` : `/novels/${novel.id}/read#chapter-${chap.id}`}
                      className={`group flex items-center justify-between p-3.5 rounded-xl border bg-card hover:shadow-sm transition-all ${
                        isLastRead ? "border-primary/50 bg-primary/5" : "border-border/50 hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                          isLastRead ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:text-primary"
                        }`}>
                          {isLastRead ? <BookMarked className="w-3.5 h-3.5" /> : chap.chapterNumber}
                        </div>
                        <div>
                          <div className="font-medium text-sm group-hover:text-primary transition-colors">{chap.title}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span>{chap.wordCount.toLocaleString()} kata</span>
                            {chap.isGenerated && <span className="text-primary/70 flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" />AI</span>}
                            {isLastRead && lastRead.progressPct > 0 && <span className="text-primary font-medium">· {lastRead.progressPct}%</span>}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                <p className="text-muted-foreground text-sm mb-4">Belum ada bab. Biarkan AI menulis bab pertama!</p>
                <button
                  onClick={handleGenerate} disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 disabled:opacity-60 transition-colors"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGenerating ? "Menulis..." : "Generate Bab 1"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: KARAKTER ─────────────────────────────────────────────── */}
        {tab === "karakter" && (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold text-base">{characters.length} Karakter</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleExtractChars}
                  disabled={extracting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-60"
                >
                  {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  Ekstrak dari Sinopsis
                </button>
                <button
                  onClick={() => setShowAddChar(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Manual
                </button>
              </div>
            </div>

            {extractError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {extractError}
              </div>
            )}

            <AnimatePresence>
              {showAddChar && (
                <AddCharacterForm onAdd={handleAddChar} onCancel={() => setShowAddChar(false)} />
              )}
            </AnimatePresence>

            {charsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2].map(i => <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />)}
              </div>
            ) : characters.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {characters.map(char => (
                  <CharacterCard key={char.id} char={char} onDelete={() => handleDeleteChar(char.id)} onEdit={updated => handleEditChar(char.id, updated)} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-border rounded-2xl">
                <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-2">Belum ada karakter.</p>
                <p className="text-xs text-muted-foreground">Tambah manual atau ekstrak otomatis dari sinopsis.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: MASTER CONCEPT ───────────────────────────────────────── */}
        {tab === "master" && (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-base">Master Concept</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Rencana keseluruhan cerita — prolog hingga ending. AI akan mengikuti ini saat generate bab.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateMaster}
                  disabled={generatingMaster}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-60"
                >
                  {generatingMaster ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  Generate dari Sinopsis
                </button>
                <button
                  onClick={handleSaveMaster}
                  disabled={savingMaster}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    masterSaved
                      ? "bg-green-500/10 text-green-500"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  } disabled:opacity-70`}
                >
                  {savingMaster ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                    masterSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {masterSaved ? "Tersimpan!" : "Simpan"}
                </button>
              </div>
            </div>

            {masterError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {masterError}
              </div>
            )}

            <textarea
              value={masterConcept}
              onChange={e => setMasterConcept(e.target.value)}
              rows={20}
              placeholder={`Tulis rencana cerita lengkap di sini...\n\nContoh:\n# Master Concept: ${novel.title}\n\n## Prolog\nCerita dimulai dengan...\n\n## Arc 1 - Kebangkitan\n...\n\n## Arc 2 - Konflik Utama\n...\n\n## Ending\n...`}
              className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-sm font-serif leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:font-sans"
            />

            {masterConcept.trim() && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                Master Concept aktif — AI akan menggunakan ini sebagai panduan utama generate bab.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
