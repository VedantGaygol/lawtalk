import { Router } from "express";
import { db } from "../db/index";
import { casesTable, lawyersTable, notificationsTable, usersTable } from "../db/schema/index";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateCaseBody } from "../generated/zod/index";
import { io } from "../app";

const router = Router();

// GET /api/cases - Get cases for current user or lawyer
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    let cases;
    if (role === "lawyer") {
      // Get lawyer id from lawyer record
      const [lawyer] = await db
        .select()
        .from(lawyersTable)
        .where(eq(lawyersTable.userId, userId))
        .limit(1);

      if (!lawyer) {
        res.json({ cases: [], total: 0 });
        return;
      }

      cases = await db
        .select()
        .from(casesTable)
        .where(eq(casesTable.assignedLawyerId, lawyer.id));
    } else {
      cases = await db
        .select()
        .from(casesTable)
        .where(eq(casesTable.userId, userId));
    }

    res.json({ cases, total: cases.length });
  } catch (err) {
    console.error("Get cases error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/cases - Create a new case
router.post("/", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const body = CreateCaseBody.parse(req.body);
    const userId = req.user!.userId;

    const [newCase] = await db
      .insert(casesTable)
      .values({
        ...body,
        userId,
        status: "open",
      })
      .returning();

    res.status(201).json(newCase);
  } catch (err) {
    console.error("Create case error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:caseId
router.get("/:caseId", requireAuth, async (req, res) => {
  try {
    const caseId = parseInt(req.params.caseId as string);
    const [caseItem] = await db
      .select()
      .from(casesTable)
      .where(eq(casesTable.id, caseId))
      .limit(1);

    if (!caseItem) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    res.json(caseItem);
  } catch (err) {
    console.error("Get case by id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:caseId/lawyer - Get assigned lawyer for a case
router.get("/:caseId/lawyer", requireAuth, async (req, res) => {
  try {
    const caseId = parseInt(req.params.caseId as string);
    const [caseItem] = await db
      .select()
      .from(casesTable)
      .where(eq(casesTable.id, caseId))
      .limit(1);

    if (!caseItem || !caseItem.assignedLawyerId) {
      res.status(404).json({ error: "No assigned lawyer" });
      return;
    }

    const { usersTable } = await import("../db/schema/index");
    const rows = await db
      .select()
      .from(lawyersTable)
      .innerJoin(usersTable, eq(lawyersTable.userId, usersTable.id))
      .where(eq(lawyersTable.id, caseItem.assignedLawyerId))
      .limit(1);

    if (!rows.length) { res.status(404).json({ error: "Lawyer not found" }); return; }

    const { lawyers, users } = rows[0]!;
    res.json({
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
      rating: lawyers.rating,
      reviewCount: lawyers.reviewCount,
      lawyerCode: lawyers.lawyerCode,
    });
  } catch (err) {
    console.error("Get case lawyer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:caseId/recommendations - AI lawyer recommendations via Python service
router.get("/:caseId/recommendations", requireAuth, async (req, res) => {
  try {
    const caseId = parseInt(req.params.caseId as string);
    const [caseItem] = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
    if (!caseItem) { res.status(404).json({ error: "Case not found" }); return; }

    const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:5001";
    const response = await fetch(`${aiUrl}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: caseItem.category,
        location: caseItem.location || "",
        budget: caseItem.budget || 0,
      }),
    });

    if (!response.ok) {
      const err = await response.json() as { error?: string };
      res.status(502).json({ error: err.error || "AI service error" });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Recommendations error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:caseId/analysis - Dummy AI analysis
router.get("/:caseId/analysis", requireAuth, async (req, res) => {
  try {
    const caseId = parseInt(req.params.caseId as string);
    const [caseItem] = await db
      .select()
      .from(casesTable)
      .where(eq(casesTable.id, caseId))
      .limit(1);

    if (!caseItem) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    // Dummy AI analysis - simulate AI response
    const analyses: Record<string, {
      caseType: string;
      winningProbability: number;
      legalSection: string;
      similarCases: string[];
      recommendation: string;
      keyPoints: string[];
    }> = {
      "Criminal Law": {
        caseType: "Criminal Defense",
        winningProbability: 68,
        legalSection: "IPC Section 302, 304, 498A",
        similarCases: ["State v. Sharma (2019)", "Verma v. State of Delhi (2021)", "Kumar & Ors v. Union of India (2020)"],
        recommendation: "Strong defense possible. Gather alibi evidence and witness statements immediately.",
        keyPoints: [
          "Evidence collection is critical",
          "Witness testimony may strengthen defense",
          "Constitutional rights must be protected",
          "Bail application recommended",
        ],
      },
      "Family Law": {
        caseType: "Matrimonial Dispute",
        winningProbability: 74,
        legalSection: "Hindu Marriage Act 1955, Section 13",
        similarCases: ["Malhotra v. Malhotra (2020)", "Singh v. Kaur (2022)", "Desai v. Desai (2019)"],
        recommendation: "Mediation recommended before proceeding to court. Document all evidence of grounds.",
        keyPoints: [
          "Mediation can save time and cost",
          "Documentation is essential",
          "Child custody terms need early planning",
          "Financial settlement should be negotiated",
        ],
      },
    };

    const analysis = analyses[caseItem.category] || {
      caseType: `${caseItem.category} Case`,
      winningProbability: Math.floor(Math.random() * 40) + 50,
      legalSection: "Relevant IPC and Civil Procedure Code sections",
      similarCases: [
        "Similar Case 1 (2020)",
        "Similar Case 2 (2021)",
        "Similar Case 3 (2022)",
      ],
      recommendation: "Consult with a specialized lawyer for detailed analysis. Gather all relevant documents.",
      keyPoints: [
        "Document all relevant evidence",
        "Consult specialized counsel",
        "Timeline adherence is important",
        "Alternative dispute resolution may be beneficial",
      ],
    };

    res.json({ caseId, ...analysis });
  } catch (err) {
    console.error("Case analysis error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/cases/:caseId/solve-pending — check if lawyer sent a solve confirmation to user
router.get("/:caseId/solve-pending", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const caseId = parseInt(req.params.caseId as string);
    const userId = req.user!.userId;

    // Find the most recent unread "Case Solved" notification for this user+case
    const [notification] = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.relatedId, caseId),
          eq(notificationsTable.type, "case_update"),
          eq(notificationsTable.isRead, false)
        )
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(1);

    const pending = !!notification && notification.title.includes("Case Solved");
    res.json({ pending, notificationId: pending ? notification!.id : null });
  } catch (err) {
    console.error("Solve pending check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/cases/:caseId/mark-solved — lawyer marks case as solved, notifies user
router.put("/:caseId/mark-solved", requireAuth, requireRole("lawyer"), async (req, res) => {
  try {
    const caseId = parseInt(req.params.caseId as string);
    const userId = req.user!.userId;

    const [lawyer] = await db.select().from(lawyersTable).where(eq(lawyersTable.userId, userId)).limit(1);
    if (!lawyer) { res.status(404).json({ error: "Lawyer not found" }); return; }

    const [caseItem] = await db.select().from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.assignedLawyerId, lawyer.id)))
      .limit(1);
    if (!caseItem) { res.status(404).json({ error: "Case not found or not assigned to you" }); return; }

    if (caseItem.status !== "in_progress") {
      res.status(400).json({ error: "Case must be in progress to mark as solved" }); return;
    }

    // Notify the user with a solve-confirmation notification (relatedId = caseId)
    await db.insert(notificationsTable).values({
      userId: caseItem.userId,
      title: "Case Solved — Please Confirm",
      message: `Your lawyer has marked the case "${caseItem.title}" as solved. Please confirm if the issue is resolved.`,
      type: "case_update",
      relatedId: caseId,
    });

    io.emit(`user_${caseItem.userId}_new_notification`, {});
    res.json({ success: true });
  } catch (err) {
    console.error("Mark solved error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/cases/:caseId/confirm-solved — user confirms yes/no
router.put("/:caseId/confirm-solved", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const caseId = parseInt(req.params.caseId as string);
    const userId = req.user!.userId;
    const { confirmed } = req.body as { confirmed: boolean };

    const [caseItem] = await db.select().from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)))
      .limit(1);
    if (!caseItem) { res.status(404).json({ error: "Case not found" }); return; }
    if (!caseItem.assignedLawyerId) { res.status(400).json({ error: "No lawyer assigned" }); return; }

    // Mark the solve-confirmation notification as read so banner disappears
    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.relatedId, caseId),
          eq(notificationsTable.type, "case_update"),
          eq(notificationsTable.isRead, false)
        )
      );

    if (confirmed) {
      await db.update(casesTable)
        .set({ status: "resolved", updatedAt: new Date() })
        .where(eq(casesTable.id, caseId));

      // Notify lawyer
      const [lawyer] = await db.select().from(lawyersTable).where(eq(lawyersTable.id, caseItem.assignedLawyerId)).limit(1);
      if (lawyer) {
        await db.insert(notificationsTable).values({
          userId: lawyer.userId,
          title: "Case Resolved ✅",
          message: `The client has confirmed that the case "${caseItem.title}" is resolved.`,
          type: "case_update",
          relatedId: caseId,
        });
        io.emit(`user_${lawyer.userId}_new_notification`, {});
      }
      res.json({ status: "resolved" });
    } else {
      // User says not solved — keep in_progress, notify lawyer
      await db.update(casesTable)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(casesTable.id, caseId));

      const [lawyer] = await db.select().from(lawyersTable).where(eq(lawyersTable.id, caseItem.assignedLawyerId)).limit(1);
      if (lawyer) {
        await db.insert(notificationsTable).values({
          userId: lawyer.userId,
          title: "Case Reopened ⚠️",
          message: `The client has indicated that the case "${caseItem.title}" is NOT yet resolved. Please continue working on it.`,
          type: "case_update",
          relatedId: caseId,
        });
        io.emit(`user_${lawyer.userId}_new_notification`, {});
      }
      res.json({ status: "in_progress" });
    }
  } catch (err) {
    console.error("Confirm solved error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
