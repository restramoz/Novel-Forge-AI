import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/lib/theme";
import { Feather, Moon, Sun, BookOpen, Music, Settings, Library, Home, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import FloatingMusic from "@/components/floating-music";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/", label: "Library", icon: Library },
  { href: "/music", label: "Music", icon: Music },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isReader = location.includes("/read");

  const isActive = (href: string, label: string) => {
    if (label === "Library" || label === "Home") return location === "/";
    return location.startsWith(href) && href !== "/";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Navbar */}
      <AnimatePresence>
        {!isReader && (
          <motion.header
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
                  <Feather className="w-4 h-4" />
                </div>
                <span className="font-serif font-bold text-xl tracking-tight">Novel AI</span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href, label);
                  return (
                    <Link
                      key={label}
                      href={href}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileOpen(o => !o)}
                  className="md:hidden p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
              {mobileOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden"
                >
                  <nav className="flex flex-col p-3 gap-1">
                    {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                      const active = isActive(href, label);
                      return (
                        <Link
                          key={label}
                          href={href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {label}
                        </Link>
                      );
                    })}
                  </nav>
                </motion.div>
              )}
            </AnimatePresence>
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

      {/* Floating music player — visible on all pages */}
      <FloatingMusic />
    </div>
  );
}
