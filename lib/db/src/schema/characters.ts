import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { novelsTable } from "./novels";

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  novelId: integer("novel_id").notNull().references(() => novelsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull().default("Supporting"),
  description: text("description").default(""),
  characteristics: text("characteristics").default("[]"),
  avatarEmoji: text("avatar_emoji").default("👤"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Character = typeof charactersTable.$inferSelect;
export type InsertCharacter = typeof charactersTable.$inferInsert;
