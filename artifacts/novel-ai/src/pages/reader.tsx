import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useGetNovel, useListChapters } from "@workspace/api-client-react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Settings2, Bookmark, BookMarked, Moon, Sun, Type } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { motion, AnimatePresence } from "framer-motion";
import { saveLastRead, getLastRead } from "@/hooks/use-last-read";

export default function Reader() {
  const { id } = useParams();
  const novelId = parseInt(id || "0");
  const isResume = new URLSearchParams(window.location.search).get("resume") === "1";

  const { theme, setTheme } = useTheme();
  const { data: novel, isLoading: novelLoading } = useGetNovel(novelId);
  const { data: chaptersData, isLoading: chaptersLoading } = useListChapters(novelId);
  const chapters = chaptersData?.chapters || [];

  const [activeChapterId, setActiveChapterId] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [showSettings, setShowSettings] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [bookmarkFlash, setBookmarkFlash] = useState(false);

  // Track last saved position to detect actual movement
  const lastSavedScrollY = useRef<number>(-1);

  // ── helpers ──────────────────────────────────────────────────────────────────
  function stripLeadingHeading(content: string): string {
    return content.replace(/^#{1,3}[^\n]*\n+/, "").trim();
  }
  function cleanTitle(title: string): string {
    return title.replace(/^(Bab|Chapter)\s+\d+[:\s]+/i, "").trim();
  }

  // Returns the chapter currently visible at the top reading area
  const getActiveChapter = useCallback(() => {
    // Find the last chapter whose top is at or above the reading line (160px from top)
    let active: (typeof chapters)[0] | null = null;
    for (const chap of chapters) {
      const el = document.getElementById(`chapter-${chap.id}`);
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top <= 160) active = chap;
      else break; // chapters are ordered, so we can stop early
    }
    return active;
  }, [chapters]);

  // ── Scroll handler: progress bar + active TOC highlight ───────────────────
  useEffect(() => {
    const onScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      setReadingProgress(pct);

      const chap = getActiveChapter();
      if (chap && chap.id !== activeChapterId) setActiveChapterId(chap.id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [chapters, activeChapterId, getActiveChapter]);

  // ── Interval save: every 2 seconds, persist position if user has moved ─────
  useEffect(() => {
    if (chapters.length === 0) return;

    const interval = setInterval(() => {
      const currentY = window.scrollY;

      // Skip if barely moved from last save (< 50px)
      if (Math.abs(currentY - lastSavedScrollY.current) < 50) return;

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progressPct = totalHeight > 0 ? Math.round((currentY / totalHeight) * 100) : 0;

      const chap = getActiveChapter();
      if (!chap) return;

      lastSavedScrollY.current = currentY;

      saveLastRead(novelId, {
        chapterId: chap.id,
        chapterNumber: chap.chapterNumber,
        chapterTitle: chap.title,
        scrollY: currentY,
        progressPct,
      });

      // Brief visual feedback on the bookmark icon
      setBookmarkFlash(true);
      setTimeout(() => setBookmarkFlash(false), 700);
    }, 2000);

    return () => clearInterval(interval);
  }, [chapters, novelId, getActiveChapter]);

  // ── Initial scroll: resume exact position OR hash OR top ──────────────────
  useEffect(() => {
    if (chapters.length === 0) return;

    const go = () => {
      if (isResume) {
        const saved = getLastRead(novelId);
        if (saved && saved.scrollY > 50) {
          // Seed the ref so the interval doesn't immediately re-save position 0
          lastSavedScrollY.current = saved.scrollY;
          window.scrollTo({ top: saved.scrollY, behavior: "smooth" });
          return;
        }
      }
      if (window.location.hash) {
        const el = document.getElementById(window.location.hash.substring(1));
        if (el) { el.scrollIntoView({ behavior: "smooth" }); return; }
      }
      // First-time visit: mark chapter 1 as start
      const first = chapters[0];
      if (first) {
        setActiveChapterId(first.id);
        lastSavedScrollY.current = 0;
        saveLastRead(novelId, {
          chapterId: first.id,
          chapterNumber: first.chapterNumber,
          chapterTitle: first.title,
          scrollY: 0,
          progressPct: 0,
        });
      }
    };

    const t = setTimeout(go, 400);
    return () => clearTimeout(t);
  }, [chapters.length, novelId, isResume]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (novelLoading || chaptersLoading) {
    return (
      <div className="h-screen flex items-center justify-center font-serif text-2xl animate-pulse">
        Loading Book...
      </div>
    );
  }
  if (!novel) {
    return <div className="h-screen flex items-center justify-center">Novel not found.</div>;
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-500">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <div
          className="h-full bg-primary transition-all duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Floating Toolbar */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <Link
          href={`/novels/${novel.id}`}
          className="w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Bookmark indicator — pulses briefly each time position saves */}
        <div
          title="Posisi tersimpan otomatis"
          className={`w-10 h-10 rounded-full bg-card/80 backdrop-blur border shadow-lg flex items-center justify-center transition-all duration-300 ${
            bookmarkFlash
              ? "text-primary border-primary scale-110"
              : "text-muted-foreground border-border"
          }`}
        >
          {bookmarkFlash ? <BookMarked className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-10 h-10 rounded-full bg-card/80 backdrop-blur border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-16 right-4 z-50 w-64 bg-card border border-border rounded-2xl shadow-2xl p-4 flex flex-col gap-4"
          >
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
              Display Settings
            </h4>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Moon className="w-4 h-4" /> Theme
              </span>
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setTheme("light")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${theme === "light" ? "bg-background shadow" : "text-muted-foreground"}`}
                >
                  Light
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium ${theme === "dark" ? "bg-background shadow" : "text-muted-foreground"}`}
                >
                  Dark
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Type className="w-4 h-4" /> Size
                </span>
                <span className="text-xs text-muted-foreground">{fontSize}px</span>
              </div>
              <input
                type="range" min="14" max="24" step="1"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto flex">
        {/* Sticky Sidebar TOC */}
        <aside className="hidden lg:block w-64 flex-shrink-0 pt-24 pb-12 sticky top-0 h-screen overflow-y-auto border-r border-border/50 pr-6">
          <div className="mb-8">
            <h2 className="font-serif font-bold text-xl leading-tight mb-2">{novel.title}</h2>
            <p className="text-sm text-muted-foreground">AI Generated</p>
          </div>
          <nav className="space-y-1 relative">
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border/50 z-0" />
            {chapters.map((chap) => {
              const isActive = activeChapterId === chap.id;
              return (
                <a
                  key={chap.id}
                  href={`#chapter-${chap.id}`}
                  className={`relative z-10 flex items-center gap-4 py-2 text-sm transition-all ${
                    isActive ? "text-primary font-medium pl-2" : "text-muted-foreground hover:text-foreground pl-0"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center bg-background border-2 transition-colors ${
                      isActive ? "border-primary" : "border-border/50"
                    }`}
                  >
                    {isActive && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <span className="truncate">
                    {chap.chapterNumber}. {cleanTitle(chap.title)}
                  </span>
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-8 md:px-12 lg:px-24 pt-24 pb-32 max-w-4xl mx-auto w-full">
          {chapters.length === 0 ? (
            <div className="text-center py-32 opacity-50">
              <BookMarked className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-serif">No chapters to read yet.</h2>
            </div>
          ) : (
            <div className="space-y-32">
              {chapters.map((chap, index) => (
                <article key={chap.id} id={`chapter-${chap.id}`} className="scroll-mt-24">
                  <header className="mb-12 text-center">
                    <span className="text-primary font-bold tracking-widest uppercase text-sm mb-4 block">
                      Chapter {chap.chapterNumber}
                    </span>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight">
                      {cleanTitle(chap.title)}
                    </h1>
                    {index === 0 && <hr className="w-24 mx-auto mt-12 border-primary/30" />}
                  </header>

                  <div
                    className="prose-reader max-w-none text-justify"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    <ReactMarkdown>{stripLeadingHeading(chap.content)}</ReactMarkdown>
                  </div>

                  {index < chapters.length - 1 && (
                    <div className="flex justify-center my-24 opacity-30 text-2xl tracking-[1em]">
                      * * *
                    </div>
                  )}
                </article>
              ))}

              <div className="text-center pt-24 pb-12 opacity-50">
                <Bookmark className="w-8 h-8 mx-auto mb-4" />
                <p className="font-serif italic">To be continued...</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
