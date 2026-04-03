const KEY = "novel-ai-settings";

export interface AppSettings {
  ollamaEndpoint: "local" | string; // "local" or custom URL
  defaultModel: string;
  readerFontFamily: string;
  readerFontSize: number;
  uiFontSize: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  ollamaEndpoint: "local",
  defaultModel: "deepseek-v3.2:cloud",
  readerFontFamily: "serif",
  readerFontSize: 18,
  uiFontSize: 16,
};

export const MODEL_LIST = [
  "deepseek-v3.2:cloud",
  "bjoernb/claude-opus-4-5:latest",
  "gemma3:27b-cloud",
  "glm-5:cloud",
  "rnj-1:8b-cloud",
  "gemini-3-flash-preview:cloud",
  "qwen3.5:cloud",
  "qwen3.5:397b-cloud",
];

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    // Migrate: "cloud" → "local"
    if (parsed.ollamaEndpoint === "cloud") parsed.ollamaEndpoint = "local";
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Partial<AppSettings>) {
  try {
    const current = loadSettings();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...s }));
  } catch {}
}
