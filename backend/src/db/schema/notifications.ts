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

export const notificationTypeEnum = pgEnum("notification_type", [
  "case_update",
  "request",
  "message",
  "approval",
  "system",
]);

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: notificationTypeEnum("type").notNull().default("system"),
  isRead: boolean("is_read").notNull().default(false),
  relatedId: integer("related_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(
  notificationsTable,
).omit({ id: true, createdAt: true });

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
