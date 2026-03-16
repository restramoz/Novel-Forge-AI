import { pgTable, serial, text, integer, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { novelsTable } from "./novels";

export const chaptersTable = pgTable("chapters", {
  id: serial("id").primaryKey(),
  novelId: integer("novel_id").notNull().references(() => novelsTable.id, { onDelete: "cascade" }),
  chapterNumber: integer("chapter_number").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull().default(0),
  isGenerated: boolean("is_generated").notNull().default(false),
  generationPrompt: text("generation_prompt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique("chapters_novel_chapter_unique").on(table.novelId, table.chapterNumber),
]);

export const insertChapterSchema = createInsertSchema(chaptersTable).omit({
  id: true,
  wordCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type Chapter = typeof chaptersTable.$inferSelect;
