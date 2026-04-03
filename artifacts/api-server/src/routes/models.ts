import { Router, type IRouter } from "express";

const router: IRouter = Router();

const LOCAL_OLLAMA = "http://localhost:11434";

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

function resolveHost(endpoint?: string): string {
  if (!endpoint || endpoint === "local" || endpoint === "cloud") return LOCAL_OLLAMA;
  return endpoint;
}

router.get("/models", async (req, res) => {
  const endpoint = req.query.endpoint as string | undefined;
  const host = resolveHost(endpoint);
  const now = new Date().toISOString();

  try {
    const response = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(4000) });
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
