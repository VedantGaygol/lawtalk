import { Router } from "express";
import { db } from "../db/index";
import { casesTable, lawyersTable } from "../db/schema/index";
import { eq, and, or } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateCaseBody } from "../generated/zod/index";

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
    const caseId = parseInt(req.params.caseId!);
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
    const caseId = parseInt(req.params.caseId!);
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

// GET /api/cases/:caseId/analysis - Dummy AI analysis
router.get("/:caseId/analysis", requireAuth, async (req, res) => {
  try {
    const caseId = parseInt(req.params.caseId!);
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

export default router;
