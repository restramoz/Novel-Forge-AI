import React from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/lib/theme";
import { Feather, Moon, Sun, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const isReader = location.includes("/read");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Navbar - hidden in reader mode for immersion */}
      <AnimatePresence>
        {!isReader && (
          <motion.header 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
                  <Feather className="w-4 h-4" />
                </div>
                <span className="font-serif font-bold text-xl tracking-tight">Novel AI</span>
              </Link>
              
              <div className="flex items-center gap-6">
                <nav className="hidden md:flex gap-6">
                  <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Library</Link>
                  <Link href="/novels/new" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Write</Link>
                </nav>
                
                <div className="w-px h-6 bg-border"></div>
                
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {!isReader && (
        <footer className="border-t border-border/50 py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span className="font-serif text-sm">Crafted with AI</span>
            </div>
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Novel AI. All rights reserved.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
