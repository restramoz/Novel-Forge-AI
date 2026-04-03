import { useState, useEffect } from "react";
import { Settings, Save, Wifi, WifiOff, CheckCircle, AlertCircle, Type, Brain, Loader2 } from "lucide-react";
import { loadSettings, saveSettings, MODEL_LIST, type AppSettings } from "@/lib/settings-store";
import { motion } from "framer-motion";
import { useTheme } from "@/lib/theme";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const FONT_FAMILIES = [
  { label: "Serif (default)", value: "serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Garamond", value: "Garamond, serif" },
  { label: "Sans-Serif", value: "sans-serif" },
  { label: "Monospace", value: "monospace" },
];

export default function SettingsPage() {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [customEndpoint, setCustomEndpoint] = useState("");

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    if (s.ollamaEndpoint !== "local") {
      setCustomEndpoint(s.ollamaEndpoint);
    }
  }, []);

  const effectiveEndpoint = settings.ollamaEndpoint === "local" ? "local" : (customEndpoint.trim() || "local");

  const handleSave = () => {
    const toSave = { ...settings, ollamaEndpoint: effectiveEndpoint };
    saveSettings(toSave);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const resp = await fetch(`${API_BASE}/api/models?endpoint=${encodeURIComponent(effectiveEndpoint)}`, {
        signal: AbortSignal.timeout(8000),
      });
      setTestResult(resp.ok ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  const update = (partial: Partial<AppSettings>) => setSettings(s => ({ ...s, ...partial }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-serif">Settings</h1>
          <p className="text-sm text-muted-foreground">Font & AI configuration</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Font Settings */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Reading Font</h2>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Font Family</label>
            <select
              value={settings.readerFontFamily}
              onChange={e => update({ readerFontFamily: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {FONT_FAMILIES.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground flex justify-between mb-2">
              <span>Font Size</span>
              <span className="text-primary">{settings.readerFontSize}px</span>
            </label>
            <input
              type="range" min="14" max="26" step="1"
              value={settings.readerFontSize}
              onChange={e => update({ readerFontSize: parseInt(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>14px</span><span>26px</span>
            </div>
          </div>

          {/* Preview */}
          <div
            className="p-4 rounded-xl bg-background/50 border border-border text-sm leading-relaxed"
            style={{ fontFamily: settings.readerFontFamily, fontSize: `${settings.readerFontSize}px` }}
          >
            "Angin berhembus lembut di antara dedaunan yang berbisik, membawa pesan dari dunia yang jauh..."
          </div>
        </section>

        {/* AI Settings */}
        <section className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">AI Setup</h2>
          </div>

          {/* Endpoint */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-3">Ollama Endpoint</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { key: "local", label: "Local", icon: <WifiOff className="w-3.5 h-3.5" /> },
                { key: "custom", label: "Custom URL", icon: <Wifi className="w-3.5 h-3.5" /> },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => update({ ollamaEndpoint: opt.key === "local" ? "local" : (customEndpoint || "custom") })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1.5 ${
                    (opt.key === "local" && settings.ollamaEndpoint === "local") ||
                    (opt.key === "custom" && settings.ollamaEndpoint !== "local")
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
            {settings.ollamaEndpoint === "local" ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> Menggunakan: http://localhost:11434
              </p>
            ) : (
              <input
                type="url"
                placeholder="http://your-ollama-host:11434"
                value={customEndpoint}
                onChange={e => { setCustomEndpoint(e.target.value); update({ ollamaEndpoint: e.target.value || "local" }); }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
              />
            )}
          </div>

          {/* Model */}
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Default Model</label>
            <select
              value={settings.defaultModel}
              onChange={e => update({ defaultModel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
            >
              {MODEL_LIST.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Test connection */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/50 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              Test Connection
            </button>
            {testResult === "ok" && (
              <span className="text-green-500 text-sm flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Connected
              </span>
            )}
            {testResult === "fail" && (
              <span className="text-red-500 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Failed to connect
              </span>
            )}
          </div>
        </section>

        {/* Save button */}
        <motion.button
          onClick={handleSave}
          whileTap={{ scale: 0.97 }}
          className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            saved
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {saved ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Settings</>
          )}
        </motion.button>
      </div>
    </div>
  );
}
