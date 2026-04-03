import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { novelsTable, chaptersTable } from "@workspace/db/schema";
import { eq, ilike, and, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

function parseTagsForDb(tags: string[] | undefined): string {
  return JSON.stringify(tags ?? []);
}

function parseTagsFromDb(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return [];
  try {
    return JSON.parse(tagsStr);
  } catch {
    return [];
  }
}

function formatNovel(novel: typeof novelsTable.$inferSelect) {
  return {
    ...novel,
    tags: parseTagsFromDb(novel.tags),
  };
}

router.get("/novels", async (req, res) => {
  try {
    const { genre, search, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (genre) conditions.push(eq(novelsTable.genre, genre));
    if (search) conditions.push(ilike(novelsTable.title, `%${search}%`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [novels, countResult] = await Promise.all([
      db
        .select()
        .from(novelsTable)
        .where(whereClause)
        .orderBy(desc(novelsTable.updatedAt))
        .limit(limitNum)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(novelsTable)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    res.json({
      novels: novels.map(formatNovel),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("Error listing novels:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.post("/novels", async (req, res) => {
  try {
    const { title, synopsis, genre, tags, language, model, writingStyle, targetChapters, coverImage } = req.body;
    if (!title || !genre) {
      return res.status(400).json({ error: "validation_error", message: "title and genre are required" });
    }

    const [novel] = await db
      .insert(novelsTable)
      .values({
        title,
        synopsis: synopsis ?? "",
        genre,
        tags: parseTagsForDb(tags),
        language: language ?? "Indonesian",
        model: model ?? "qwen2.5:72b-instruct",
        writingStyle: writingStyle ?? "",
        targetChapters: targetChapters ?? 10,
        status: "draft",
        coverImage: coverImage ?? null,
      })
      .returning();

    res.status(201).json(formatNovel(novel));
  } catch (err) {
    console.error("Error creating novel:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.get("/novels/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [novel] = await db.select().from(novelsTable).where(eq(novelsTable.id, id));
    if (!novel) return res.status(404).json({ error: "not_found", message: "Novel not found" });
    res.json(formatNovel(novel));
  } catch (err) {
    console.error("Error getting novel:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.put("/novels/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, synopsis, genre, tags, language, model, writingStyle, targetChapters, status, coverImage, masterConcept, customPrompt } = req.body;

    const updateData: Partial<typeof novelsTable.$inferInsert> = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (synopsis !== undefined) updateData.synopsis = synopsis;
    if (genre !== undefined) updateData.genre = genre;
    if (tags !== undefined) updateData.tags = parseTagsForDb(tags);
    if (language !== undefined) updateData.language = language;
    if (model !== undefined) updateData.model = model;
    if (writingStyle !== undefined) updateData.writingStyle = writingStyle;
    if (targetChapters !== undefined) updateData.targetChapters = targetChapters;
    if (status !== undefined) updateData.status = status;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (masterConcept !== undefined) updateData.masterConcept = masterConcept;
    if (customPrompt !== undefined) updateData.customPrompt = customPrompt;

    const [updated] = await db.update(novelsTable).set(updateData).where(eq(novelsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "not_found", message: "Novel not found" });
    res.json(formatNovel(updated));
  } catch (err) {
    console.error("Error updating novel:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.delete("/novels/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [deleted] = await db.delete(novelsTable).where(eq(novelsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "not_found", message: "Novel not found" });
    res.json({ success: true, message: "Novel deleted" });
  } catch (err) {
    console.error("Error deleting novel:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

// Generate master concept from synopsis using AI
const MASTER_CONCEPT_API_KEY = "ff272933709f4fc59467cc47b8c0cd02.XXqy0eSTEGXQ8OAZpfGzH1wR";

router.post("/novels/:id/generate-master-concept", async (req, res) => {
  const id = parseInt(req.params.id);
  const { ollamaEndpoint } = req.body;

  try {
    const [novel] = await db.select().from(novelsTable).where(eq(novelsTable.id, id));
    if (!novel) return res.status(404).json({ error: "not_found" });
    if (!novel.synopsis?.trim()) return res.status(400).json({ error: "no_synopsis", message: "Sinopsis kosong." });

    const host = !ollamaEndpoint || ollamaEndpoint === "local" ? "http://localhost:11434"
      : ollamaEndpoint === "cloud" ? "https://ollama.com" : ollamaEndpoint;
    const isCloud = host.includes("ollama.com");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (isCloud) headers["Authorization"] = `Bearer ${MASTER_CONCEPT_API_KEY}`;

    const prompt = `Berdasarkan sinopsis berikut, buat Master Concept (rencana cerita lengkap) untuk novel "${novel.title}" genre ${novel.genre} dalam bahasa ${novel.language}.

Master Concept harus mencakup (format Markdown):
## Prolog/Pembuka
## Arc 1 - [Nama Arc]
## Arc 2 - [Nama Arc]
## (Arc tambahan jika perlu — tidak ada batasan jumlah arc)
## Klimaks
## Ending/Resolusi
## Catatan Karakter Utama

Buat rencana yang detail, menarik, penuh plot twist, dan konsisten dari awal hingga akhir.

Sinopsis: ${novel.synopsis}`;

    const resp = await fetch(`${host}/api/chat`, {
      method: "POST", headers,
      body: JSON.stringify({
        model: novel.model || "deepseek-v3.2:cloud",
        messages: [{ role: "user", content: prompt }],
        stream: false,
        options: { temperature: 0.75, num_predict: 3000 },
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!resp.ok) return res.status(502).json({ error: "ollama_error", message: await resp.text() });

    const data = await resp.json() as { message?: { content?: string }; response?: string };
    const concept = data.message?.content ?? data.response ?? "";
    if (!concept.trim()) return res.status(502).json({ error: "empty_response" });

    res.json({ masterConcept: concept });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

export default router;
