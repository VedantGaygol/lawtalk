import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { lawyersTable } from "./lawyers";
import { casesTable } from "./cases";

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const requestsTable = pgTable("requests", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id")
    .notNull()
    .references(() => casesTable.id),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  lawyerId: integer("lawyer_id")
    .notNull()
    .references(() => lawyersTable.id),
  status: requestStatusEnum("status").notNull().default("pending"),
  message: text("message"),
  roomCode: text("room_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Request = typeof requestsTable.$inferSelect;
