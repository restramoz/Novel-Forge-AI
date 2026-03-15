import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useGetNovel, useListChapters, useDeleteNovel, getListNovelsQueryKey, getListChaptersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useChapterStream } from "@/hooks/use-stream";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Edit3, Trash2, ArrowLeft, PenTool, Sparkles, Clock, FileText, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function NovelDetail() {
  const { id } = useParams();
  const novelId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: novel, isLoading: novelLoading } = useGetNovel(novelId);
  const { data: chaptersData, isLoading: chaptersLoading } = useListChapters(novelId);
  const { mutate: deleteNovel, isPending: isDeleting } = useDeleteNovel();
  const { generate, isGenerating } = useChapterStream(novelId);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateContext, setGenerateContext] = useState("");
  const [generateTitle, setGenerateTitle] = useState("");
  const [streamedContent, setStreamedContent] = useState("");

  const chapters = chaptersData?.chapters || [];

  if (novelLoading) return <div className="p-20 text-center animate-pulse">Loading...</div>;
  if (!novel) return <div className="p-20 text-center">Novel not found</div>;

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this entire novel?")) {
      deleteNovel({ id: novelId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNovelsQueryKey() });
          setLocation("/");
        }
      });
    }
  };

  const handleGenerateStart = async () => {
    setStreamedContent("");
    const nextNum = chapters.length + 1;
    await generate({
      chapterTitle: generateTitle || `Chapter ${nextNum}`,
      additionalContext: generateContext,
      model: novel.model
    }, (chunk) => {
      setStreamedContent(prev => prev + chunk);
    });
    
    // When done, refresh list and close modal
    queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(novelId) });
    setShowGenerateModal(false);
    setGenerateContext("");
    setGenerateTitle("");
  };

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* Header/Cover Section */}
      <div className="relative w-full bg-card border-b border-border/50">
        <div className="absolute inset-0 overflow-hidden">
           <img 
            src={novel.coverImage || `${import.meta.env.BASE_URL}images/cover-placeholder.png`} 
            alt="Cover blur"
            className="w-full h-full object-cover opacity-10 blur-3xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card"></div>
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
                  {novel.status.replace('_', ' ')}
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4 leading-tight">
                {novel.title}
              </h1>
              
              <p className="text-muted-foreground text-lg leading-relaxed mb-8 max-w-3xl">
                {novel.synopsis || "No synopsis provided."}
              </p>
              
              <div className="flex flex-wrap gap-6 mb-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{novel.chapterCount} Chapters</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{novel.wordCount.toLocaleString()} Words</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Updated {format(new Date(novel.updatedAt), "MMM d, yyyy")}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 mt-auto">
                <Link 
                  href={`/novels/${novel.id}/read`}
                  className="flex items-center gap-2 px-8 py-3 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all"
                >
                  <BookOpen className="w-5 h-5" />
                  Read Novel
                </Link>
                <button 
                  onClick={() => setShowGenerateModal(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate Next
                </button>
                
                <div className="ml-auto flex items-center gap-2">
                  <Link href={`/novels/${novel.id}/edit`} className="p-3 rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors" title="Edit Metadata">
                    <Edit3 className="w-5 h-5" />
                  </Link>
                  <button onClick={handleDelete} disabled={isDeleting} className="p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors" title="Delete Novel">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters Section */}
      <div className="max-w-4xl mx-auto px-4 w-full mt-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-serif font-bold">Table of Contents</h2>
          <Link 
            href={`/novels/${novel.id}/chapters/new`}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <PenTool className="w-4 h-4" />
            Add Manual Chapter
          </Link>
        </div>

        {chaptersLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse"></div>)}
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
                      <span>{chap.wordCount} words</span>
                      {chap.isGenerated && (
                        <span className="flex items-center gap-1 text-primary/80">
                          <Sparkles className="w-3 h-3" /> AI
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium text-primary">Read</span>
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/50">
            <p className="text-muted-foreground mb-4">No chapters yet. Let the AI write the first one!</p>
            <button 
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Generate Chapter 1
            </button>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => !isGenerating && setShowGenerateModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border/50 flex items-center gap-3 bg-muted/30">
                <Sparkles className="w-6 h-6 text-primary" />
                <h2 className="text-xl font-serif font-bold">Generate Next Chapter</h2>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {isGenerating || streamedContent ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-primary animate-pulse mb-4">
                      <Wand2 className="w-4 h-4" /> {isGenerating ? "AI is writing..." : "Generation complete."}
                    </div>
                    <div className="prose-reader text-sm opacity-80 whitespace-pre-wrap font-reader border border-border/50 rounded-xl p-6 bg-background h-[50vh] overflow-y-auto">
                      {streamedContent}
                      {isGenerating && <span className="inline-block w-2 h-4 ml-1 bg-primary animate-ping" />}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Chapter Title (Optional)</label>
                      <input 
                        value={generateTitle} onChange={e => setGenerateTitle(e.target.value)}
                        placeholder={`Chapter ${chapters.length + 1}`}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Directives / Context</label>
                      <textarea 
                        rows={4} value={generateContext} onChange={e => setGenerateContext(e.target.value)}
                        placeholder="What should happen in this chapter? Any specific plot points?"
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:border-primary transition-all resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-2">The AI already knows the novel synopsis, style, and previous chapters.</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-border/50 flex justify-end gap-3 bg-muted/30">
                {!isGenerating && !streamedContent && (
                  <>
                    <button onClick={() => setShowGenerateModal(false)} className="px-6 py-2.5 rounded-xl font-medium hover:bg-muted transition-colors">Cancel</button>
                    <button onClick={handleGenerateStart} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all">Begin Generation</button>
                  </>
                )}
                {streamedContent && !isGenerating && (
                  <button onClick={() => setShowGenerateModal(false)} className="px-6 py-2.5 rounded-xl bg-foreground text-background font-medium hover:-translate-y-0.5 transition-all">Done</button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
