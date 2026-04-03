import { Router, type IRouter } from "express";

const router: IRouter = Router();

const OLLAMA_CLOUD_HOST = "https://ollama.com";
const OLLAMA_LOCAL_HOST = "http://localhost:11434";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "ff272933709f4fc59467cc47b8c0cd02.XXqy0eSTEGXQ8OAZpfGzH1wR";

const CURATED_MODELS = [
  "deepseek-v3.2:cloud",
  "bjoernb/claude-opus-4-5:latest",
  "gemma3:27b-cloud",
  "glm-5:cloud",
  "rnj-1:8b-cloud",
  "gemini-3-flash-preview:cloud",
  "qwen3.5:cloud",
  "qwen3.5:397b-cloud",
];

router.get("/models", async (req, res) => {
  const endpoint = (req.query.endpoint as string) || "local";
  const host = endpoint === "cloud" ? OLLAMA_CLOUD_HOST : endpoint === "local" ? OLLAMA_LOCAL_HOST : endpoint;
  const isCloud = host.includes("ollama.com");
  const now = new Date().toISOString();

  try {
    const headers: Record<string, string> = {};
    if (isCloud) headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;

    const response = await fetch(`${host}/api/tags`, {
      headers,
      signal: AbortSignal.timeout(4000),
    });

    if (response.ok) {
      const data = (await response.json()) as { models?: Array<{ name: string; size: number; modified_at: string }> };
      const fetched = (data.models ?? []).map((m) => ({ name: m.name, size: m.size, modifiedAt: m.modified_at }));
      if (fetched.length > 0) return res.json({ models: fetched, source: host });
    }
  } catch {
    // fall through to curated list
  }

  res.json({ models: CURATED_MODELS.map(name => ({ name, size: 0, modifiedAt: now })), source: "curated" });
});

export default router;
