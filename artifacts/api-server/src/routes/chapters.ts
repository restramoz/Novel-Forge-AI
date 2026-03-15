import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { chaptersTable, novelsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router({ mergeParams: true });

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
    .set({
      chapterCount,
      wordCount,
      updatedAt: new Date(),
      status: chapterCount > 0 ? "in_progress" : "draft",
    })
    .where(eq(novelsTable.id, novelId));
}

router.get("/", async (req, res) => {
  try {
    const novelId = parseInt(req.params.id);
    const chapters = await db
      .select()
      .from(chaptersTable)
      .where(eq(chaptersTable.novelId, novelId))
      .orderBy(chaptersTable.chapterNumber);

    res.json({ chapters, total: chapters.length });
  } catch (err) {
    console.error("Error listing chapters:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.post("/", async (req, res) => {
  try {
    const novelId = parseInt(req.params.id);
    const { title, content, chapterNumber } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "validation_error", message: "title and content are required" });
    }

    const existing = await db
      .select({ max: sql<number>`max(chapter_number)` })
      .from(chaptersTable)
      .where(eq(chaptersTable.novelId, novelId));

    const nextNumber = chapterNumber ?? (Number(existing[0]?.max ?? 0) + 1);
    const wc = countWords(content);

    const [chapter] = await db
      .insert(chaptersTable)
      .values({
        novelId,
        chapterNumber: nextNumber,
        title,
        content,
        wordCount: wc,
        isGenerated: false,
      })
      .returning();

    await updateNovelStats(novelId);
    res.status(201).json(chapter);
  } catch (err) {
    console.error("Error creating chapter:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.get("/:chapterId", async (req, res) => {
  try {
    const novelId = parseInt(req.params.id);
    const chapterId = parseInt(req.params.chapterId);

    const [chapter] = await db
      .select()
      .from(chaptersTable)
      .where(and(eq(chaptersTable.id, chapterId), eq(chaptersTable.novelId, novelId)));

    if (!chapter) return res.status(404).json({ error: "not_found", message: "Chapter not found" });
    res.json(chapter);
  } catch (err) {
    console.error("Error getting chapter:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.put("/:chapterId", async (req, res) => {
  try {
    const novelId = parseInt(req.params.id);
    const chapterId = parseInt(req.params.chapterId);
    const { title, content } = req.body;

    const updateData: Partial<typeof chaptersTable.$inferInsert> = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) {
      updateData.content = content;
      updateData.wordCount = countWords(content);
    }

    const [updated] = await db
      .update(chaptersTable)
      .set(updateData)
      .where(and(eq(chaptersTable.id, chapterId), eq(chaptersTable.novelId, novelId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "not_found", message: "Chapter not found" });

    await updateNovelStats(novelId);
    res.json(updated);
  } catch (err) {
    console.error("Error updating chapter:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.delete("/:chapterId", async (req, res) => {
  try {
    const novelId = parseInt(req.params.id);
    const chapterId = parseInt(req.params.chapterId);

    const [deleted] = await db
      .delete(chaptersTable)
      .where(and(eq(chaptersTable.id, chapterId), eq(chaptersTable.novelId, novelId)))
      .returning();

    if (!deleted) return res.status(404).json({ error: "not_found", message: "Chapter not found" });

    await updateNovelStats(novelId);
    res.json({ success: true, message: "Chapter deleted" });
  } catch (err) {
    console.error("Error deleting chapter:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

export default router;
