import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { charactersTable, novelsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router({ mergeParams: true });
const LOCAL_OLLAMA = "http://localhost:11434";

function resolveOllamaHost(endpoint?: string): string {
  if (!endpoint || endpoint === "local" || endpoint === "cloud") return LOCAL_OLLAMA;
  return endpoint; // custom URL
}

function parseChars(raw: string | null | undefined) {
  try { return JSON.parse(raw || "[]"); } catch { return []; }
}
function fmtChar(c: typeof charactersTable.$inferSelect) {
  return { ...c, characteristics: parseChars(c.characteristics) };
}

// LIST
router.get("/", async (req: Request, res: Response) => {
  try {
    const novelId = parseInt(req.params.id);
    const list = await db.select().from(charactersTable).where(eq(charactersTable.novelId, novelId));
    res.json({ characters: list.map(fmtChar) });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

// CREATE
router.post("/", async (req: Request, res: Response) => {
  try {
    const novelId = parseInt(req.params.id);
    const { name, role = "Supporting", description = "", characteristics = [], avatarEmoji = "👤" } = req.body;
    if (!name) return res.status(400).json({ error: "name_required" });
    const [char] = await db.insert(charactersTable).values({
      novelId, name, role, description,
      characteristics: JSON.stringify(characteristics),
      avatarEmoji,
    }).returning();
    res.status(201).json(fmtChar(char));
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

// UPDATE
router.put("/:charId", async (req: Request, res: Response) => {
  try {
    const charId = parseInt(req.params.charId);
    const { name, role, description, characteristics, avatarEmoji } = req.body;
    const upd: Partial<typeof charactersTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) upd.name = name;
    if (role !== undefined) upd.role = role;
    if (description !== undefined) upd.description = description;
    if (characteristics !== undefined) upd.characteristics = JSON.stringify(characteristics);
    if (avatarEmoji !== undefined) upd.avatarEmoji = avatarEmoji;
    const [updated] = await db.update(charactersTable).set(upd).where(eq(charactersTable.id, charId)).returning();
    if (!updated) return res.status(404).json({ error: "not_found" });
    res.json(fmtChar(updated));
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

// DELETE
router.delete("/:charId", async (req: Request, res: Response) => {
  try {
    const charId = parseInt(req.params.charId);
    await db.delete(charactersTable).where(eq(charactersTable.id, charId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

// AI EXTRACT from synopsis
router.post("/extract", async (req: Request, res: Response) => {
  try {
    const novelId = parseInt(req.params.id);
    const { model = "deepseek-v3.2:cloud", ollamaEndpoint } = req.body;

    const [novel] = await db.select().from(novelsTable).where(eq(novelsTable.id, novelId));
    if (!novel) return res.status(404).json({ error: "not_found" });

    const sourceText = (novel.masterConcept?.trim() || novel.synopsis?.trim() || "");
    if (!sourceText) return res.status(400).json({ error: "no_content", message: "Sinopsis/Master Concept novel kosong." });

    const host = resolveOllamaHost(ollamaEndpoint);

    const prompt = `Dari teks berikut, ekstrak semua karakter yang disebutkan atau tersirat.
Kembalikan HANYA JSON array tanpa teks lain:
[
  {
    "name": "Nama Karakter",
    "role": "Protagonist | Antagonist | Supporting | Mentor | Villain",
    "description": "Deskripsi singkat karakter (1-2 kalimat)",
    "characteristics": ["Sifat 1", "Sifat 2", "Sifat 3"],
    "avatarEmoji": "emoji yang merepresentasikan karakter"
  }
]

Teks:
${sourceText.substring(0, 3000)}`;

    const resp = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        stream: false,
        options: { temperature: 0.3, num_predict: 2000 },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(502).json({ error: "ollama_error", message: errText });
    }

    const data = (await resp.json()) as { message?: { content?: string }; response?: string };
    const raw = data.message?.content ?? data.response ?? "";

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(502).json({ error: "parse_error", message: "AI tidak mengembalikan JSON valid" });

    const chars = JSON.parse(jsonMatch[0]) as Array<{
      name: string; role: string; description: string; characteristics: string[]; avatarEmoji: string;
    }>;

    const inserted = await Promise.all(chars.map(c =>
      db.insert(charactersTable).values({
        novelId, name: c.name, role: c.role || "Supporting",
        description: c.description || "",
        characteristics: JSON.stringify(c.characteristics || []),
        avatarEmoji: c.avatarEmoji || "👤",
      }).returning()
    ));

    res.json({ characters: inserted.flat().map(fmtChar) });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

export default router;
