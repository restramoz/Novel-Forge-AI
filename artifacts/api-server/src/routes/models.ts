import { Router, type IRouter } from "express";

const router: IRouter = Router();

const OLLAMA_HOST = "https://ollama.com";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "ff272933709f4fc59467cc47b8c0cd02.XXqy0eSTEGXQ8OAZpfGzH1wR";

const PREFERRED_MODELS = [
  "deepseek-v3",
  "qwen2.5:72b-instruct",
  "llama-3.3-70b-specdec",
  "qwen2.5:32b-instruct",
  "llama3.3:70b",
  "mistral-large",
  "qwen2.5:14b-instruct",
  "llama3.1:8b",
];

router.get("/models", async (_req, res) => {
  const now = new Date().toISOString();

  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      headers: { "Authorization": `Bearer ${OLLAMA_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const data = (await response.json()) as { models?: Array<{ name: string; size: number; modified_at: string }> };
      const fetched = (data.models ?? []).map((m) => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
      }));
      if (fetched.length > 0) return res.json({ models: fetched });
    }
  } catch {
    // fall through to default list
  }

  res.json({
    models: PREFERRED_MODELS.map((name) => ({ name, size: 0, modifiedAt: now })),
  });
});

export default router;
