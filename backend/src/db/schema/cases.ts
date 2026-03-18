import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { lawyersTable } from "./lawyers";

export const caseStatusEnum = pgEnum("case_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  location: text("location"),
  budget: real("budget"),
  status: caseStatusEnum("status").notNull().default("open"),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  assignedLawyerId: integer("assigned_lawyer_id").references(
    () => lawyersTable.id,
  ),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
