import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetNovel, useListChapters, useDeleteNovel, getListNovelsQueryKey, getListChaptersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useChapterStream } from "@/hooks/use-stream";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Edit3, Trash2, ArrowLeft, PenTool, Sparkles, Clock, FileText, ChevronRight, Loader2, CheckCircle2, BookMarked } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { getLastRead, type LastReadInfo } from "@/hooks/use-last-read";

export default function NovelDetail() {
  const { id } = useParams();
  const novelId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: novel, isLoading: novelLoading } = useGetNovel(novelId);
  const { data: chaptersData, isLoading: chaptersLoading } = useListChapters(novelId);
  const { mutate: deleteNovel, isPending: isDeleting } = useDeleteNovel();
  const { generate, isGenerating } = useChapterStream(novelId);

  const [generateDone, setGenerateDone] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [streamPreview, setStreamPreview] = useState("");
  const [lastRead, setLastRead] = useState<LastReadInfo | null>(null);

  useEffect(() => {
    setLastRead(getLastRead(novelId));
  }, [novelId]);

  const chapters = chaptersData?.chapters || [];

  if (novelLoading) return <div className="p-20 text-center animate-pulse">Memuat...</div>;
  if (!novel) return <div className="p-20 text-center">Novel tidak ditemukan</div>;

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
    setGenerateDone(false);
    setGenerateError("");
    setStreamPreview("");

    const result = await generate(
      { model: novel.model },
      (chunk) => {
        setStreamPreview(prev => {
          const next = prev + chunk;
          return next.length > 600 ? next.slice(-600) : next;
        });
      }
    );

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(novelId) });
      queryClient.invalidateQueries({ queryKey: ["getNovel", novelId] });
      setGenerateDone(true);
      setStreamPreview("");
      setTimeout(() => setGenerateDone(false), 4000);
    } else {
      setGenerateError(result.error ?? "Terjadi kesalahan saat generate");
      setStreamPreview("");
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* Header/Cover */}
      <div className="relative w-full bg-card border-b border-border/50">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={novel.coverImage || `${import.meta.env.BASE_URL}images/cover-placeholder.png`}
            alt="Cover blur"
            className="w-full h-full object-cover opacity-10 blur-3xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Library
          </Link>

          <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
            <div className="w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border border-border/50">
                <img
                  src={novel.coverImage || `${import.meta.env.BASE_URL}images/cover-placeholder.png`}
                  alt={novel.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col pt-2">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold tracking-wide uppercase">
                  {novel.genre}
                </span>
                <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-semibold tracking-wide uppercase">
                  {novel.status.replace("_", " ")}
                </span>
                <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                  {novel.model}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4 leading-tight">
                {novel.title}
              </h1>

              <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-3xl">
                {novel.synopsis || "Tidak ada sinopsis."}
              </p>

              <div className="flex flex-wrap gap-6 mb-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{novel.chapterCount} Bab</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{novel.wordCount.toLocaleString()} Kata</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Diperbarui {format(new Date(novel.updatedAt), "d MMM yyyy")}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-auto">
                {lastRead ? (
                  <Link
                    href={`/novels/${novel.id}/read#chapter-${lastRead.chapterId}`}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all"
                  >
                    <BookMarked className="w-5 h-5" />
                    <span className="flex flex-col items-start leading-tight">
                      <span className="text-xs font-normal opacity-70">Lanjut Baca</span>
                      <span>Bab {lastRead.chapterNumber}</span>
                    </span>
                  </Link>
                ) : (
                  <Link
                    href={`/novels/${novel.id}/read`}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all"
                  >
                    <BookOpen className="w-5 h-5" />
                    Baca Novel
                  </Link>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Menulis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Bab Selanjutnya
                    </>
                  )}
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <Link
                    href={`/novels/${novel.id}/edit`}
                    className="p-3 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    title="Edit Novel"
                  >
                    <Edit3 className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    title="Hapus Novel"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Status Banner */}
      <AnimatePresence>
        {(isGenerating || generateDone || generateError) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mx-auto w-full max-w-4xl mt-6 px-4`}
          >
            {isGenerating && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                  <span className="font-semibold text-primary">AI sedang menulis Bab {chapters.length + 1}...</span>
                </div>
                {streamPreview && (
                  <p className="text-sm text-muted-foreground font-serif leading-relaxed line-clamp-3 border-t border-border/30 pt-3">
                    {streamPreview}
                  </p>
                )}
              </div>
            )}
            {generateDone && !isGenerating && (
              <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="font-semibold text-green-600 dark:text-green-400">Bab baru berhasil dibuat!</span>
              </div>
            )}
            {generateError && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <strong>Gagal:</strong> {generateError}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapters List */}
      <div className="max-w-4xl mx-auto px-4 w-full mt-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-serif font-bold">Daftar Bab</h2>
          <Link
            href={`/novels/${novel.id}/chapters/new`}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <PenTool className="w-4 h-4" />
            Tambah Bab Manual
          </Link>
        </div>

        {chaptersLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : chapters.length > 0 ? (
          <div className="flex flex-col gap-3">
            {chapters.map((chap) => (
              <Link
                key={chap.id}
                href={`/novels/${novel.id}/read#chapter-${chap.id}`}
                className="group flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-serif font-bold text-muted-foreground group-hover:text-primary transition-colors">
                    {chap.chapterNumber}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {chap.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{chap.wordCount.toLocaleString()} kata</span>
                      {chap.isGenerated && (
                        <span className="flex items-center gap-1 text-primary/80">
                          <Sparkles className="w-3 h-3" /> AI
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium text-primary">Baca</span>
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/50">
            <p className="text-muted-foreground mb-6">Belum ada bab. Biarkan AI menulis bab pertama!</p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors disabled:opacity-60"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? "Menulis Bab 1..." : "Generate Bab 1"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
