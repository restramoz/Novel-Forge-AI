import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useCreateChapter, getListChaptersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Save, FileText } from "lucide-react";
import { Link } from "wouter";

export default function CreateChapter() {
  const { id } = useParams();
  const novelId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    chapterNumber: 1 // Default, ideally backend auto-increments or UI fetches last number
  });

  const { mutate, isPending } = useCreateChapter({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChaptersQueryKey(novelId) });
        setLocation(`/novels/${novelId}`);
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ id: novelId, data: formData });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-4 py-12 w-full flex-1 flex flex-col"
    >
      <div className="flex items-center justify-between mb-8">
        <Link href={`/novels/${novelId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Novel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={isPending || !formData.title || !formData.content}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Saving..." : "Save Chapter"}
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold tracking-tight mb-2">Write Chapter</h1>
        <p className="text-muted-foreground">Add a chapter manually to your novel. Markdown formatting is supported.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="w-32">
            <label className="block text-sm font-medium mb-2 text-muted-foreground">Number</label>
            <input 
              type="number" required min="1"
              value={formData.chapterNumber}
              onChange={e => setFormData({...formData, chapterNumber: parseInt(e.target.value) || 1})}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:border-primary transition-all font-serif text-lg text-center"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2 text-muted-foreground">Chapter Title</label>
            <input 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. The Gathering Storm"
              className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:border-primary transition-all font-serif text-lg"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-[500px]">
          <label className="flex items-center gap-2 text-sm font-medium mb-2 text-muted-foreground">
            <FileText className="w-4 h-4" /> Content
          </label>
          <textarea 
            required
            value={formData.content}
            onChange={e => setFormData({...formData, content: e.target.value})}
            placeholder="Write your story here..."
            className="flex-1 w-full px-6 py-6 bg-card border border-border rounded-2xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none font-reader text-lg leading-relaxed shadow-inner"
          />
        </div>
      </form>
    </motion.div>
  );
}
