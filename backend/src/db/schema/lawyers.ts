import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  boolean,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
]);

export const lawyersTable = pgTable("lawyers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  specialization: text("specialization"),
  experience: integer("experience"),
  location: text("location"),
  pricing: real("pricing"),
  bio: text("bio"),
  licenseDocument: text("license_document"),
  approvalStatus: approvalStatusEnum("approval_status")
    .notNull()
    .default("pending"),
  lawyerCode: text("lawyer_code").unique(),
  rating: real("rating"),
  reviewCount: integer("review_count").notNull().default(0),
  isProfileComplete: boolean("is_profile_complete").notNull().default(false),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLawyerSchema = createInsertSchema(lawyersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLawyer = z.infer<typeof insertLawyerSchema>;
export type Lawyer = typeof lawyersTable.$inferSelect;
