import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateNovel, getListNovelsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Book, Wand2, Settings2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const GENRES = ["Fantasy", "Romance", "Mystery", "Sci-Fi", "Horror", "Adventure", "Historical", "Drama", "Slice of Life", "Action"];

export default function CreateNovel() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: "",
    genre: "Fantasy",
    synopsis: "",
    language: "English",
    model: "qwen3.5:397b-cloud",
    writingStyle: "Descriptive and atmospheric",
    targetChapters: 20
  });

  const { mutate, isPending } = useCreateNovel({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListNovelsQueryKey() });
        setLocation(`/novels/${data.id}`);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ data: formData });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto px-4 py-12 w-full"
    >
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Library
      </Link>

      <div className="mb-10">
        <h1 className="text-4xl font-serif font-bold tracking-tight mb-3">Begin a New Tale</h1>
        <p className="text-muted-foreground text-lg">Define the parameters of your story and let the AI assist your creativity.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-xl shadow-black/5">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border/50">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Book className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-serif font-semibold">Core Concept</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Novel Title</label>
              <input 
                required
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="The Obsidian Throne"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-serif text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Primary Genre</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setFormData({...formData, genre: g})}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.genre === g 
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Synopsis / Premise</label>
              <textarea 
                rows={5}
                required
                value={formData.synopsis}
                onChange={e => setFormData({...formData, synopsis: e.target.value})}
                placeholder="In a world where magic is drawn from memories..."
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-xl shadow-black/5">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border/50">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <Settings2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-serif font-semibold">AI Configuration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Writing Style</label>
              <input 
                value={formData.writingStyle}
                onChange={e => setFormData({...formData, writingStyle: e.target.value})}
                placeholder="e.g. Brandon Sanderson, poetic, fast-paced"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select 
                value={formData.language}
                onChange={e => setFormData({...formData, language: e.target.value})}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition-all appearance-none"
              >
                <option>English</option>
                <option>Indonesian</option>
                <option>Japanese</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Target Chapters</label>
              <input 
                type="number"
                min="1"
                value={formData.targetChapters}
                onChange={e => setFormData({...formData, targetChapters: parseInt(e.target.value) || 20})}
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition-all"
              />
            </div>
             <div>
              <label className="block text-sm font-medium mb-2">AI Model</label>
              <input 
                value={formData.model}
                onChange={e => setFormData({...formData, model: e.target.value})}
                placeholder="qwen3.5:397b-cloud"
                className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-lg shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </span>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Initialize Novel
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
