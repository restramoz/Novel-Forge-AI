import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const novelsTable = pgTable("novels", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  synopsis: text("synopsis").default(""),
  genre: text("genre").notNull(),
  tags: text("tags").default("[]"),
  language: text("language").notNull().default("Indonesian"),
  model: text("model").notNull().default("llama3.2"),
  writingStyle: text("writing_style").default(""),
  targetChapters: integer("target_chapters").notNull().default(10),
  chapterCount: integer("chapter_count").notNull().default(0),
  wordCount: integer("word_count").notNull().default(0),
  status: text("status").notNull().default("draft"),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNovelSchema = createInsertSchema(novelsTable).omit({
  id: true,
  chapterCount: true,
  wordCount: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNovel = z.infer<typeof insertNovelSchema>;
export type Novel = typeof novelsTable.$inferSelect;
