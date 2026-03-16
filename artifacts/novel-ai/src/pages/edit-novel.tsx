import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetNovel, useUpdateNovel, getListNovelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Link } from "wouter";

const GENRES = ["Fantasy", "Romance", "Mystery", "Sci-Fi", "Horror", "Adventure", "Historical", "Drama", "Slice of Life", "Action"];
const LANGUAGES = ["Indonesian", "English", "Japanese", "Chinese"];

export default function EditNovel() {
  const { id } = useParams();
  const novelId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: novel, isLoading } = useGetNovel(novelId);
  const { mutate: updateNovel, isPending, isSuccess, isError, error } = useUpdateNovel();

  const [formData, setFormData] = useState({
    title: "",
    genre: "Fantasy",
    synopsis: "",
    language: "Indonesian",
    model: "deepseek-v3.2:cloud",
    writingStyle: "",
    targetChapters: 20,
    status: "draft" as "draft" | "in_progress" | "completed",
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (novel) {
      setFormData({
        title: novel.title || "",
        genre: novel.genre || "Fantasy",
        synopsis: novel.synopsis || "",
        language: novel.language || "Indonesian",
        model: novel.model || "deepseek-v3.2:cloud",
        writingStyle: novel.writingStyle || "",
        targetChapters: novel.targetChapters || 20,
        status: (novel.status as "draft" | "in_progress" | "completed") || "draft",
      });
    }
  }, [novel]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "targetChapters" ? parseInt(value) || 1 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    updateNovel(
      { id: novelId, data: formData },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNovelsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["getNovel", novelId] });
          setSaved(true);
          setTimeout(() => setLocation(`/novels/${novelId}`), 1200);
        },
      }
    );
  };

  if (isLoading) return <div className="p-20 text-center animate-pulse">Memuat...</div>;
  if (!novel) return <div className="p-20 text-center">Novel tidak ditemukan</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto px-4 py-12 w-full"
    >
      <Link href={`/novels/${novelId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Novel
      </Link>

      <div className="mb-10">
        <h1 className="text-3xl font-serif font-bold tracking-tight mb-2">Edit Novel</h1>
        <p className="text-muted-foreground">Ubah detail dan pengaturan novel ini.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Judul Novel</label>
          <input
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Judul novel..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        {/* Genre + Language */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Genre</label>
            <select
              name="genre"
              value={formData.genre}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            >
              {GENRES.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bahasa</label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            >
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Synopsis */}
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sinopsis</label>
          <textarea
            name="synopsis"
            value={formData.synopsis}
            onChange={handleChange}
            rows={4}
            placeholder="Ceritakan tentang novel ini..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
          />
        </div>

        {/* Writing Style */}
        <div className="space-y-2">
          <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gaya Penulisan</label>
          <input
            name="writingStyle"
            value={formData.writingStyle}
            onChange={handleChange}
            placeholder="Contoh: Deskriptif dan atmosferik, penuh dialog..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
        </div>

        {/* Model + Target Chapters + Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2 sm:col-span-1">
            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Model AI</label>
            <input
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="deepseek-v3.2:cloud"
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Target Bab</label>
            <input
              name="targetChapters"
              type="number"
              min={1}
              max={500}
              value={formData.targetChapters}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            >
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Gagal menyimpan: {(error as Error)?.message || "Terjadi kesalahan"}
          </div>
        )}

        {/* Success */}
        {saved && isSuccess && (
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-sm text-green-600 dark:text-green-400 font-medium">
            Tersimpan! Mengarahkan kembali...
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</>
            ) : (
              <><Save className="w-5 h-5" /> Simpan Perubahan</>
            )}
          </button>
          <Link
            href={`/novels/${novelId}`}
            className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all font-medium"
          >
            Batal
          </Link>
        </div>
      </form>
    </motion.div>
  );
}
