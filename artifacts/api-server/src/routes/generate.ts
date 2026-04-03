import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { chaptersTable, novelsTable } from "@workspace/db/schema";
import { eq, sql, desc } from "drizzle-orm";

const router: IRouter = Router({ mergeParams: true });

const LOCAL_OLLAMA = "http://localhost:11434";
const DEFAULT_MODEL = "deepseek-v3.2:cloud";

const generatingNovels = new Set<number>();

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function resolveHost(endpoint?: string): string {
  if (!endpoint || endpoint === "local" || endpoint === "cloud") return LOCAL_OLLAMA;
  return endpoint;
}

function buildSystemPrompt(
  novel: typeof novelsTable.$inferSelect,
  chapNum: number,
  lastChapterNum: number | null,
  globalSummary: string,
  lastContent: string,
): { system: string; user: string } {
  const isFirstChapter = chapNum === 1;
  const hasMasterConcept = !!novel.masterConcept?.trim();
  const hasCustomPrompt = !!novel.customPrompt?.trim();

  const storyContext = hasMasterConcept
    ? `RENCANA CERITA KESELURUHAN (Master Concept — ikuti ini sebagai panduan utama!):
${novel.masterConcept}

SINOPSIS AWAL: ${novel.synopsis || "Tidak ada sinopsis"}`
    : `SINOPSIS: ${novel.synopsis || "Tidak ada sinopsis"}`;

  const customInstruction = hasCustomPrompt ? `\nINSTRUKSI KHUSUS PENULIS:\n${novel.customPrompt}\n` : "";

  const system = `Anda adalah Penulis Novel Profesional yang menulis dalam bahasa ${novel.language}.
${customInstruction}
ATURAN MUTLAK — WAJIB DIPATUHI:
1. JANGAN mengulang judul novel, perkenalan karakter, atau latar dunia yang sudah ada di bab sebelumnya.
2. JANGAN menulis ulang atau merangkum kejadian dari bab sebelumnya.
3. MULAI narasi langsung dari detik terakhir kejadian sebelumnya — sambungkan tanpa jeda.
4. Gunakan gaya bahasa ${novel.genre} yang deskriptif, intens, dan imersif.
5. Jika ini Bab ${chapNum}, pastikan alur BERGERAK MAJU sesuai rencana cerita.
6. DILARANG menulis kata-kata seperti "Pada bab sebelumnya", "Seperti yang telah kita ketahui", "Kita kembali ke...".
7. Tulis minimal 1500 kata, dengan dialog bermakna dan deskripsi lingkungan/emosi yang kaya.
8. Format judul: hanya satu baris "# Bab ${chapNum}: [Judul Kreatif]" lalu langsung isi narasi.

INFORMASI NOVEL:
- Judul: ${novel.title}
- Genre: ${novel.genre}
- Gaya Penulisan: ${novel.writingStyle || "Deskriptif dan intens"}
- ${storyContext}

RINGKASAN DUNIA (MEMORI JANGKA PANJANG):
${globalSummary || (isFirstChapter ? "Belum ada ringkasan — ini bab pertama, bangun dunia dari awal." : "Ringkasan belum tersedia.")}`;

  let user: string;
  if (isFirstChapter) {
    user = `TUGAS: Tulis Bab 1 novel "${novel.title}".

Ini adalah bab pembuka. Perkenalkan:
- Dunia dan atmosfernya secara deskriptif
- Protagonis utama melalui aksi/situasi, bukan deskripsi datar
- Konflik atau misteri awal yang langsung menarik pembaca
- Akhiri dengan hook yang membuat penasaran

${hasMasterConcept ? "PERHATIAN: Ikuti Master Concept sebagai panduan arah cerita keseluruhan." : ""}

Tulis minimal 1500 kata. Mulai langsung dengan narasi yang kuat.`;
  } else {
    user = `KONTEKS KEJADIAN TERAKHIR (Bab ${lastChapterNum} — 1500 karakter terakhir):
---
${lastContent}
---

TUGAS: Tulis BAB ${chapNum} dari novel "${novel.title}".

INSTRUKSI TEGAS:
- Sambungkan LANGSUNG dari titik akhir konteks di atas.
- Lanjutkan aksi/dialog/situasi tanpa jeda atau pengulangan.
- Bawa alur ke konflik atau perkembangan baru yang signifikan sesuai Master Concept.
- Akhiri bab dengan cliffhanger atau momen intens yang memaksa pembaca lanjut.

Tulis minimal 1500 kata. Langsung mulai narasi tanpa basa-basi.`;
  }

  return { system, user };
}

async function updateGlobalSummary(novelId: number, chapterNum: number, chapterContent: string) {
  try {
    const [novel] = await db.select({ globalSummary: novelsTable.globalSummary }).from(novelsTable).where(eq(novelsTable.id, novelId));
    const first500Words = chapterContent.trim().split(/\s+/).slice(0, 500).join(" ");
    const summaryLine = `[Bab ${chapterNum}]: ${first500Words.substring(0, 400)}...`;
    const existing = novel?.globalSummary ?? "";
    const separator = existing.trim() ? "\n" : "";
    const newSummary = existing + separator + summaryLine;
    const trimmed = newSummary.length > 8000 ? "..." + newSummary.slice(-7800) : newSummary;
    await db.update(novelsTable).set({ globalSummary: trimmed }).where(eq(novelsTable.id, novelId));
  } catch (err) {
    console.error("Failed to update global summary:", err);
  }
}

async function updateNovelStats(novelId: number) {
  const result = await db
    .select({ count: sql<number>`count(*)`, totalWords: sql<number>`sum(word_count)` })
    .from(chaptersTable)
    .where(eq(chaptersTable.novelId, novelId));
  const chapterCount = Number(result[0]?.count ?? 0);
  const wordCount = Number(result[0]?.totalWords ?? 0);
  await db.update(novelsTable)
    .set({ chapterCount, wordCount, updatedAt: new Date(), status: "in_progress" })
    .where(eq(novelsTable.id, novelId));
}

async function getNovelContext(novelId: number) {
  const [novel] = await db.select().from(novelsTable).where(eq(novelsTable.id, novelId));
  if (!novel) return null;
  const [last] = await db
    .select({ chapterNumber: chaptersTable.chapterNumber, content: chaptersTable.content })
    .from(chaptersTable)
    .where(eq(chaptersTable.novelId, novelId))
    .orderBy(desc(chaptersTable.chapterNumber))
    .limit(1);
  return { novel, maxChapterNum: last?.chapterNumber ?? 0, lastChapter: last ?? null };
}

function buildOllamaOptions(temperature: number, maxTokens: number, chapNum: number) {
  return {
    temperature, num_predict: maxTokens, repeat_penalty: 1.25, top_p: 0.9, num_ctx: 16384,
    stop: [`Bab ${chapNum + 1}`, `BAB ${chapNum + 1}`, "PENULIS:", "---END---"],
  };
}

// ─── STREAMING GENERATE ───────────────────────────────────────────────────────

router.post("/generate-stream", async (req: Request, res: Response) => {
  const novelId = parseInt(req.params.id);
  const { model, additionalContext, temperature = 0.85, maxTokens = 8000, chapterTitle, ollamaEndpoint } = req.body;

  if (generatingNovels.has(novelId)) {
    return res.status(409).json({ error: "already_generating", message: "Bab sedang di-generate, tunggu hingga selesai." });
  }
  generatingNovels.add(novelId);

  try {
    const ctx = await getNovelContext(novelId);
    if (!ctx) return res.status(404).json({ error: "not_found" });

    const { novel, maxChapterNum, lastChapter } = ctx;
    const nextChapterNum = maxChapterNum + 1;
    const selectedModel = model || novel.model || DEFAULT_MODEL;
    const host = resolveHost(ollamaEndpoint);

    const lastTail = lastChapter ? lastChapter.content.slice(-1500).trimStart() : "";
    const { system, user: userBase } = buildSystemPrompt(
      novel, nextChapterNum, lastChapter?.chapterNumber ?? null, novel.globalSummary ?? "", lastTail,
    );
    const userPrompt = additionalContext ? `${userBase}\n\nPETUNJUK TAMBAHAN:\n${additionalContext}` : userBase;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    let fullContent = "";

    const ollamaRes = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "system", content: system }, { role: "user", content: userPrompt }],
        stream: true,
        options: buildOllamaOptions(temperature, maxTokens, nextChapterNum),
      }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      res.write(`data: ${JSON.stringify({ error: `Ollama error: ${ollamaRes.status} — ${errText}` })}\n\n`);
      res.end();
      return;
    }

    const reader = ollamaRes.body?.getReader();
    if (!reader) {
      res.write(`data: ${JSON.stringify({ error: "No response body from Ollama" })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let ollamaDone = false;

    while (!ollamaDone) {
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
          if (token) { fullContent += token; res.write(`data: ${JSON.stringify({ token, done: false })}\n\n`); }
          if (parsed.done) { ollamaDone = true; break; }
        } catch { /* skip */ }
      }
    }

    if (fullContent.trim()) {
      const wc = countWords(fullContent);
      const titleMatch = fullContent.match(/^#\s+(.+)/m);
      const detectedTitle = titleMatch
        ? titleMatch[1].replace(/^Bab\s+\d+[:\s]*/i, "").trim()
        : chapterTitle || `Bab ${nextChapterNum}`;

      const inserted = await db.insert(chaptersTable).values({
        novelId, chapterNumber: nextChapterNum,
        title: `Bab ${nextChapterNum}: ${detectedTitle}`,
        content: fullContent, wordCount: wc, isGenerated: true,
        generationPrompt: userPrompt.substring(0, 600),
      }).onConflictDoNothing().returning();

      if (inserted.length === 0) {
        res.write(`data: ${JSON.stringify({ done: true, error: `Bab ${nextChapterNum} sudah ada di database.` })}\n\n`);
        res.end();
        return;
      }

      await Promise.all([updateNovelStats(novelId), updateGlobalSummary(novelId, nextChapterNum, fullContent)]);
      res.write(`data: ${JSON.stringify({ done: true, chapter: inserted[0] })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ done: true, error: "AI tidak menghasilkan konten" })}\n\n`);
    }
    res.end();
  } catch (err) {
    console.error("Generate stream error:", err);
    try { res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`); res.end(); } catch { res.end(); }
  } finally {
    generatingNovels.delete(novelId);
  }
});

// ─── NON-STREAMING GENERATE ───────────────────────────────────────────────────

router.post("/generate", async (req: Request, res: Response) => {
  const novelId = parseInt(req.params.id);
  const { model, additionalContext, temperature = 0.85, maxTokens = 8000, chapterTitle, ollamaEndpoint } = req.body;

  if (generatingNovels.has(novelId)) {
    return res.status(409).json({ error: "already_generating" });
  }
  generatingNovels.add(novelId);

  try {
    const ctx = await getNovelContext(novelId);
    if (!ctx) return res.status(404).json({ error: "not_found" });

    const { novel, maxChapterNum, lastChapter } = ctx;
    const nextChapterNum = maxChapterNum + 1;
    const selectedModel = model || novel.model || DEFAULT_MODEL;
    const host = resolveHost(ollamaEndpoint);

    const lastTail = lastChapter ? lastChapter.content.slice(-1500).trimStart() : "";
    const { system, user: userBase } = buildSystemPrompt(
      novel, nextChapterNum, lastChapter?.chapterNumber ?? null, novel.globalSummary ?? "", lastTail,
    );
    const userPrompt = additionalContext ? `${userBase}\n\nPETUNJUK TAMBAHAN:\n${additionalContext}` : userBase;

    const ollamaRes = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "system", content: system }, { role: "user", content: userPrompt }],
        stream: false,
        options: buildOllamaOptions(temperature, maxTokens, nextChapterNum),
      }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      return res.status(502).json({ error: "ollama_error", message: errText });
    }

    const data = (await ollamaRes.json()) as { message?: { content?: string }; response?: string };
    const fullContent = data.message?.content ?? data.response ?? "";
    if (!fullContent.trim()) return res.status(502).json({ error: "no_content" });

    const wc = countWords(fullContent);
    const titleMatch = fullContent.match(/^#\s+(.+)/m);
    const detectedTitle = titleMatch
      ? titleMatch[1].replace(/^Bab\s+\d+[:\s]*/i, "").trim()
      : chapterTitle || `Bab ${nextChapterNum}`;

    const inserted = await db.insert(chaptersTable).values({
      novelId, chapterNumber: nextChapterNum,
      title: `Bab ${nextChapterNum}: ${detectedTitle}`,
      content: fullContent, wordCount: wc, isGenerated: true,
      generationPrompt: userPrompt.substring(0, 600),
    }).onConflictDoNothing().returning();

    if (inserted.length === 0) return res.status(409).json({ error: "duplicate_chapter" });

    await Promise.all([updateNovelStats(novelId), updateGlobalSummary(novelId, nextChapterNum, fullContent)]);
    res.json(inserted[0]);
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "internal_error", message: String(err) });
  } finally {
    generatingNovels.delete(novelId);
  }
});

export default router;
