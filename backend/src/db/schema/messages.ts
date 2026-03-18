import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const messageTypeEnum = pgEnum("message_type", [
  "text",
  "system",
  "file",
]);

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: text("conversation_id").notNull(),
  senderId: integer("sender_id")
    .notNull()
    .references(() => usersTable.id),
  content: text("content").notNull(),
  messageType: messageTypeEnum("message_type").notNull().default("text"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
