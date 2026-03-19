import { Router } from "express";
import { db } from "../db/index";
import {
  lawyersTable,
  usersTable,
  casesTable,
  messagesTable,
  notificationsTable,
} from "../db/schema/index";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { AdminApproveLawyerBody } from "../generated/zod/index";
import { io } from "../app";

const router = Router();

// GET /api/admin/lawyers
router.get("/lawyers", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(lawyersTable)
      .innerJoin(usersTable, eq(lawyersTable.userId, usersTable.id))
      .orderBy(lawyersTable.createdAt);

    const lawyers = rows.map(({ lawyers, users }) => ({
      id: lawyers.id,
      userId: lawyers.userId,
      name: users.name,
      email: users.email,
      specialization: lawyers.specialization,
      experience: lawyers.experience,
      location: lawyers.location,
      pricing: lawyers.pricing,
      bio: lawyers.bio,
      profileImage: users.profileImage,
      licenseDocument: lawyers.licenseDocument,
      approvalStatus: lawyers.approvalStatus,
      lawyerCode: lawyers.lawyerCode,
      rating: lawyers.rating,
      reviewCount: lawyers.reviewCount,
      isProfileComplete: lawyers.isProfileComplete,
      createdAt: lawyers.createdAt,
    }));

    res.json({ lawyers, total: lawyers.length });
  } catch (err) {
    console.error("Admin get lawyers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/lawyers/:lawyerId/approve
router.put(
  "/lawyers/:lawyerId/approve",
  requireAuth,
  requireRole("admin"),
  async (req, res) => {
    try {
      const lawyerId = parseInt(req.params.lawyerId as string);
      const body = AdminApproveLawyerBody.parse(req.body);

      await db
        .update(lawyersTable)
        .set({
          approvalStatus: body.status,
          ...(body.status === "rejected" && body.reason
            ? { rejectionReason: body.reason }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(lawyersTable.id, lawyerId));

      // Notify the lawyer
      const [lawyer] = await db
        .select()
        .from(lawyersTable)
        .where(eq(lawyersTable.id, lawyerId))
        .limit(1);

      if (lawyer) {
        await db.insert(notificationsTable).values({
          userId: lawyer.userId,
          title:
            body.status === "approved"
              ? "Application Approved"
              : "Application Rejected",
          message:
            body.status === "approved"
              ? "Congratulations! Your lawyer application has been approved. You can now access your dashboard."
              : `Your lawyer application has been rejected. Reason: ${body.reason || "Not specified"}`,
          type: "approval",
          relatedId: lawyerId,
        });
      }

      res.json({ success: true, message: `Lawyer ${body.status} successfully` });

      // Notify lawyer in real-time
      if (lawyer) {
        io.emit(`user_${lawyer.userId}_new_notification`, {});
        io.emit(`user_${lawyer.userId}_approval_updated`, {});
      }
    } catch (err) {
      console.error("Admin approve lawyer error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /api/admin/stats
router.get("/stats", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const [totalUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(eq(usersTable.role, "user"));

    const [totalLawyersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lawyersTable);

    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lawyersTable)
      .where(eq(lawyersTable.approvalStatus, "pending"));

    const [totalCasesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(casesTable);

    const [activeCasesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(casesTable)
      .where(eq(casesTable.status, "in_progress"));

    const [totalMessagesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messagesTable);

    res.json({
      totalUsers: Number(totalUsersResult?.count || 0),
      totalLawyers: Number(totalLawyersResult?.count || 0),
      pendingApprovals: Number(pendingResult?.count || 0),
      totalCases: Number(totalCasesResult?.count || 0),
      activeCases: Number(activeCasesResult?.count || 0),
      totalMessages: Number(totalMessagesResult?.count || 0),
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
