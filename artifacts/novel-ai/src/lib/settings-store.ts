const KEY = "novel-ai-settings";

export interface AppSettings {
  ollamaEndpoint: "local" | "cloud" | string;
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
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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

export function getOllamaHost(endpoint: string): string {
  if (endpoint === "local") return "http://localhost:11434";
  if (endpoint === "cloud") return "https://ollama.com";
  return endpoint;
}
