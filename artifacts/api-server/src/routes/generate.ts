import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { chaptersTable, novelsTable } from "@workspace/db/schema";
import { eq, sql, max } from "drizzle-orm";

const router: IRouter = Router({ mergeParams: true });

const OLLAMA_HOST = "https://ollama.com";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "ff272933709f4fc59467cc47b8c0cd02.XXqy0eSTEGXQ8OAZpfGzH1wR";

async function getNovelContext(novelId: number) {
  const [novel] = await db.select().from(novelsTable).where(eq(novelsTable.id, novelId));
  if (!novel) return null;

  const chapters = await db
    .select()
    .from(chaptersTable)
    .where(eq(chaptersTable.novelId, novelId))
    .orderBy(chaptersTable.chapterNumber);

  return { novel, chapters };
}

function buildSystemPrompt(novel: typeof novelsTable.$inferSelect, language: string): string {
  return `Kamu adalah penulis novel profesional yang handal. Tugas kamu adalah menulis bab novel dengan kualitas tinggi.

INFORMASI NOVEL:
- Judul: ${novel.title}
- Genre: ${novel.genre}
- Bahasa: ${language}
- Sinopsis: ${novel.synopsis || "Tidak ada sinopsis"}
- Gaya Penulisan: ${novel.writingStyle || "Deskriptif, mengalir, dan immersive"}

PANDUAN PENULISAN:
1. Tulis dalam ${language}
2. Setiap bab minimal 2000-3000 kata, penuh detail dan deskripsi
3. Gunakan dialog yang natural dan bermakna
4. Bangun suasana dan emosi yang kuat
5. Jaga konsistensi karakter dan plot dari bab sebelumnya
6. Akhiri setiap bab dengan cliffhanger atau transisi yang menarik
7. Gunakan heading dan sub-heading untuk struktur (# untuk judul bab, ## untuk sub-bagian)
8. Format: Mulai dengan "# Bab X: [Judul]" lalu konten panjang

PENTING: Tulis konten bab yang panjang, detail, dan berkualitas tinggi. Minimal 2000 kata.`;
}

function buildChapterPrompt(
  novel: typeof novelsTable.$inferSelect,
  chapters: Array<typeof chaptersTable.$inferSelect>,
  nextChapterNum: number,
  chapterTitle?: string,
  additionalContext?: string,
): string {
  const recentChapters = chapters.slice(-3);
  const contextStr = recentChapters
    .map((c) => `**${c.title}**\n${c.content.substring(0, 800)}...`)
    .join("\n\n---\n\n");

  let prompt = `Tulis BAB ${nextChapterNum}`;
  if (chapterTitle) prompt += `: ${chapterTitle}`;
  prompt += ` untuk novel "${novel.title}".`;

  if (chapters.length > 0) {
    prompt += `\n\nNovel ini sudah memiliki ${chapters.length} bab sebelumnya. Berikut ringkasan bab terakhir untuk konteks:\n\n${contextStr}`;
  } else {
    prompt += `\n\nIni adalah bab pertama novel. Mulailah dengan memperkenalkan dunia, karakter utama, dan konflik awal yang menarik.`;
  }

  if (additionalContext) {
    prompt += `\n\nPETUNJUK TAMBAHAN DARI PENULIS:\n${additionalContext}`;
  }

  prompt += `\n\nTulis bab yang panjang, penuh detail, dialog bermakna, dan deskripsi yang kaya. Minimal 2000 kata. Format output:\n# Bab ${nextChapterNum}: [Judul]\n\n[Konten bab panjang di sini...]`;

  return prompt;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function updateNovelStats(novelId: number) {
  const result = await db
    .select({
      count: sql<number>`count(*)`,
      totalWords: sql<number>`sum(word_count)`,
    })
    .from(chaptersTable)
    .where(eq(chaptersTable.novelId, novelId));

  const chapterCount = Number(result[0]?.count ?? 0);
  const wordCount = Number(result[0]?.totalWords ?? 0);

  await db
    .update(novelsTable)
    .set({ chapterCount, wordCount, updatedAt: new Date(), status: "in_progress" })
    .where(eq(novelsTable.id, novelId));
}

router.post("/generate-stream", async (req: Request, res: Response) => {
  const novelId = parseInt(req.params.id);
  const { model, additionalContext, temperature = 0.8, maxTokens = 8000, chapterTitle } = req.body;

  try {
    const ctx = await getNovelContext(novelId);
    if (!ctx) return res.status(404).json({ error: "not_found", message: "Novel not found" });

    const { novel, chapters } = ctx;
    const nextChapterNum = chapters.length + 1;
    const selectedModel = model || novel.model || "llama3.2";

    const systemPrompt = buildSystemPrompt(novel, novel.language);
    const userPrompt = buildChapterPrompt(novel, chapters, nextChapterNum, chapterTitle, additionalContext);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let fullContent = "";

    const ollamaRes = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      console.error("Ollama error:", ollamaRes.status, errText);
      res.write(`data: ${JSON.stringify({ error: `Ollama error: ${ollamaRes.status} - ${errText}` })}\n\n`);
      res.end();
      return;
    }

    const reader = ollamaRes.body?.getReader();
    if (!reader) {
      res.write(`data: ${JSON.stringify({ error: "No response body" })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const token = parsed.message?.content ?? parsed.response ?? "";
          if (token) {
            fullContent += token;
            res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`);
          }
          if (parsed.done) {
            break;
          }
        } catch {
          // skip invalid JSON lines
        }
      }
    }

    if (fullContent.trim()) {
      const wc = countWords(fullContent);
      const titleMatch = fullContent.match(/^#\s+(.+)/m);
      const detectedTitle = titleMatch ? titleMatch[1].replace(/^Bab\s+\d+:\s*/i, "").trim() : (chapterTitle || `Bab ${nextChapterNum}`);

      const [chapter] = await db
        .insert(chaptersTable)
        .values({
          novelId,
          chapterNumber: nextChapterNum,
          title: `Bab ${nextChapterNum}: ${detectedTitle}`,
          content: fullContent,
          wordCount: wc,
          isGenerated: true,
          generationPrompt: userPrompt.substring(0, 500),
        })
        .returning();

      await updateNovelStats(novelId);

      res.write(`data: ${JSON.stringify({ done: true, chapter })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ done: true, error: "No content generated" })}\n\n`);
    }

    res.end();
  } catch (err) {
    console.error("Generate stream error:", err);
    try {
      res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
      res.end();
    } catch {
      res.end();
    }
  }
});

router.post("/generate", async (req: Request, res: Response) => {
  const novelId = parseInt(req.params.id);
  const { model, additionalContext, temperature = 0.8, maxTokens = 8000, chapterTitle } = req.body;

  try {
    const ctx = await getNovelContext(novelId);
    if (!ctx) return res.status(404).json({ error: "not_found", message: "Novel not found" });

    const { novel, chapters } = ctx;
    const nextChapterNum = chapters.length + 1;
    const selectedModel = model || novel.model || "llama3.2";

    const systemPrompt = buildSystemPrompt(novel, novel.language);
    const userPrompt = buildChapterPrompt(novel, chapters, nextChapterNum, chapterTitle, additionalContext);

    const ollamaRes = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      return res.status(502).json({ error: "ollama_error", message: errText });
    }

    const data = (await ollamaRes.json()) as { message?: { content?: string }; response?: string };
    const fullContent = data.message?.content ?? data.response ?? "";

    if (!fullContent.trim()) {
      return res.status(502).json({ error: "no_content", message: "AI returned no content" });
    }

    const wc = countWords(fullContent);
    const titleMatch = fullContent.match(/^#\s+(.+)/m);
    const detectedTitle = titleMatch ? titleMatch[1].replace(/^Bab\s+\d+:\s*/i, "").trim() : (chapterTitle || `Bab ${nextChapterNum}`);

    const [chapter] = await db
      .insert(chaptersTable)
      .values({
        novelId,
        chapterNumber: nextChapterNum,
        title: `Bab ${nextChapterNum}: ${detectedTitle}`,
        content: fullContent,
        wordCount: wc,
        isGenerated: true,
        generationPrompt: userPrompt.substring(0, 500),
      })
      .returning();

    await updateNovelStats(novelId);
    res.json(chapter);
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.get("/models", async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      headers: {
        "Authorization": `Bearer ${OLLAMA_API_KEY}`,
      },
    });

    if (!response.ok) {
      return res.status(200).json({
        models: [
          { name: "llama3.2", size: 0, modifiedAt: new Date().toISOString() },
          { name: "llama3.1", size: 0, modifiedAt: new Date().toISOString() },
          { name: "mistral", size: 0, modifiedAt: new Date().toISOString() },
          { name: "qwen2.5", size: 0, modifiedAt: new Date().toISOString() },
          { name: "gemma2", size: 0, modifiedAt: new Date().toISOString() },
          { name: "phi3", size: 0, modifiedAt: new Date().toISOString() },
          { name: "deepseek-r1", size: 0, modifiedAt: new Date().toISOString() },
        ],
      });
    }

    const data = (await response.json()) as { models?: Array<{ name: string; size: number; modified_at: string }> };
    const models = (data.models ?? []).map((m) => ({
      name: m.name,
      size: m.size,
      modifiedAt: m.modified_at,
    }));

    if (models.length === 0) {
      return res.status(200).json({
        models: [
          { name: "llama3.2", size: 0, modifiedAt: new Date().toISOString() },
          { name: "llama3.1", size: 0, modifiedAt: new Date().toISOString() },
          { name: "mistral", size: 0, modifiedAt: new Date().toISOString() },
          { name: "qwen2.5", size: 0, modifiedAt: new Date().toISOString() },
          { name: "gemma2", size: 0, modifiedAt: new Date().toISOString() },
          { name: "phi3", size: 0, modifiedAt: new Date().toISOString() },
          { name: "deepseek-r1", size: 0, modifiedAt: new Date().toISOString() },
        ],
      });
    }

    res.json({ models });
  } catch (err) {
    console.error("Error fetching models:", err);
    res.status(200).json({
      models: [
        { name: "llama3.2", size: 0, modifiedAt: new Date().toISOString() },
        { name: "llama3.1", size: 0, modifiedAt: new Date().toISOString() },
        { name: "mistral", size: 0, modifiedAt: new Date().toISOString() },
        { name: "qwen2.5", size: 0, modifiedAt: new Date().toISOString() },
        { name: "gemma2", size: 0, modifiedAt: new Date().toISOString() },
        { name: "phi3", size: 0, modifiedAt: new Date().toISOString() },
        { name: "deepseek-r1", size: 0, modifiedAt: new Date().toISOString() },
      ],
    });
  }
});

export default router;
