import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { lawyersTable } from "./lawyers";
import { casesTable } from "./cases";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  lawyerId: integer("lawyer_id")
    .notNull()
    .references(() => lawyersTable.id),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  caseId: integer("case_id")
    .references(() => casesTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
