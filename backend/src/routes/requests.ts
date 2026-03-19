import { Router } from "express";
import { db } from "../db/index";
import {
  requestsTable,
  casesTable,
  lawyersTable,
  notificationsTable,
  usersTable,
} from "../db/schema/index";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateRequestBody, RespondToRequestBody } from "../generated/zod/index";

const router = Router();

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase() +
    "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

async function formatRequest(req: any, cas: any, lawyer?: any, user?: any) {
  return {
    id: req.id,
    caseId: req.caseId,
    userId: req.userId,
    lawyerId: req.lawyerId,
    status: req.status,
    message: req.message,
    roomCode: req.roomCode,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
    case: cas,
    lawyer: lawyer ? {
      id: lawyer.id,
      name: lawyer.name,
      email: lawyer.email,
      specialization: lawyer.specialization,
      experience: lawyer.experience,
      location: lawyer.location,
      pricing: lawyer.pricing,
      bio: lawyer.bio,
      profileImage: lawyer.profileImage,
      rating: lawyer.rating,
      reviewCount: lawyer.reviewCount,
      lawyerCode: lawyer.lawyerCode,
    } : null,
    user: user ? {
      id: user.id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
    } : null,
  };
}

// GET /api/requests
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    if (role === "lawyer") {
      const [lawyer] = await db
        .select()
        .from(lawyersTable)
        .where(eq(lawyersTable.userId, userId))
        .limit(1);

      if (!lawyer) { res.json({ requests: [], total: 0 }); return; }

      const rows = await db
        .select()
        .from(requestsTable)
        .innerJoin(casesTable, eq(requestsTable.caseId, casesTable.id))
        .innerJoin(usersTable, eq(requestsTable.userId, usersTable.id))
        .where(eq(requestsTable.lawyerId, lawyer.id));

      const requests = await Promise.all(rows.map(({ requests, cases, users }) =>
        formatRequest(requests, cases, null, users)
      ));
      res.json({ requests, total: requests.length });
    } else {
      const rows = await db
        .select()
        .from(requestsTable)
        .innerJoin(casesTable, eq(requestsTable.caseId, casesTable.id))
        .where(eq(requestsTable.userId, userId));

      // Fetch lawyer info for each request
      const requests = await Promise.all(rows.map(async ({ requests, cases }) => {
        const lawyerRows = await db
          .select()
          .from(lawyersTable)
          .innerJoin(usersTable, eq(lawyersTable.userId, usersTable.id))
          .where(eq(lawyersTable.id, requests.lawyerId))
          .limit(1);
        const lawyerData = lawyerRows[0];
        const mergedLawyer = lawyerData ? { ...lawyerData.lawyers, name: lawyerData.users.name, email: lawyerData.users.email, profileImage: lawyerData.users.profileImage } : null;
        return formatRequest(requests, cases, mergedLawyer, null);
      }));
      res.json({ requests, total: requests.length });
    }
  } catch (err) {
    console.error("Get requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/requests/:requestId
router.get("/:requestId", requireAuth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId as string);
    const userId = req.user!.userId;
    const role = req.user!.role;

    const rows = await db
      .select()
      .from(requestsTable)
      .innerJoin(casesTable, eq(requestsTable.caseId, casesTable.id))
      .where(eq(requestsTable.id, requestId))
      .limit(1);

    if (!rows.length) { res.status(404).json({ error: "Request not found" }); return; }

    const { requests, cases } = rows[0]!;

    // Auth check
    if (role === "user" && requests.userId !== userId) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    if (role === "lawyer") {
      const [lawyer] = await db.select().from(lawyersTable).where(eq(lawyersTable.userId, userId)).limit(1);
      if (!lawyer || requests.lawyerId !== lawyer.id) {
        res.status(403).json({ error: "Forbidden" }); return;
      }
    }

    const lawyerRows = await db
      .select()
      .from(lawyersTable)
      .innerJoin(usersTable, eq(lawyersTable.userId, usersTable.id))
      .where(eq(lawyersTable.id, requests.lawyerId))
      .limit(1);
    const lawyerData = lawyerRows[0];
    const mergedLawyer = lawyerData ? { ...lawyerData.lawyers, name: lawyerData.users.name, email: lawyerData.users.email, profileImage: lawyerData.users.profileImage } : null;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, requests.userId)).limit(1);

    res.json(await formatRequest(requests, cases, mergedLawyer, user || null));
  } catch (err) {
    console.error("Get request by id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/requests
router.post("/", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const body = CreateRequestBody.parse(req.body);
    const userId = req.user!.userId;

    const [caseItem] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, body.caseId), eq(casesTable.userId, userId)))
      .limit(1);

    if (!caseItem) { res.status(404).json({ error: "Case not found or not yours" }); return; }

    const [request] = await db
      .insert(requestsTable)
      .values({ caseId: body.caseId, userId, lawyerId: body.lawyerId, message: body.message, status: "pending" })
      .returning();

    const [lawyer] = await db.select().from(lawyersTable).where(eq(lawyersTable.id, body.lawyerId)).limit(1);
    if (lawyer) {
      await db.insert(notificationsTable).values({
        userId: lawyer.userId,
        title: "New Case Request",
        message: `You have a new case request for: ${caseItem.title}`,
        type: "request",
        relatedId: request!.id,
      });
    }

    res.status(201).json({ ...request, case: caseItem });
  } catch (err) {
    console.error("Create request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/requests/:requestId/respond
router.put("/:requestId/respond", requireAuth, requireRole("lawyer"), async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId as string);
    const body = RespondToRequestBody.parse(req.body);
    const userId = req.user!.userId;

    const [lawyer] = await db.select().from(lawyersTable).where(eq(lawyersTable.userId, userId)).limit(1);
    if (!lawyer) { res.status(404).json({ error: "Lawyer not found" }); return; }

    const [request] = await db
      .select()
      .from(requestsTable)
      .where(and(eq(requestsTable.id, requestId), eq(requestsTable.lawyerId, lawyer.id)))
      .limit(1);

    if (!request) { res.status(404).json({ error: "Request not found" }); return; }

    const roomCode = body.status === "accepted" ? generateRoomCode() : null;

    const [updated] = await db
      .update(requestsTable)
      .set({
        status: body.status,
        ...(roomCode ? { roomCode } : {}),
        updatedAt: new Date(),
      })
      .where(eq(requestsTable.id, requestId))
      .returning();

    if (body.status === "accepted") {
      await db
        .update(casesTable)
        .set({ status: "in_progress", assignedLawyerId: lawyer.id, updatedAt: new Date() })
        .where(eq(casesTable.id, request.caseId));
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, request.userId)).limit(1);
    if (user) {
      await db.insert(notificationsTable).values({
        userId: user.id,
        title: body.status === "accepted" ? "Request Accepted! 🎉" : "Request Rejected",
        message: body.status === "accepted"
          ? `Your case request has been accepted. Your room code is: ${roomCode}. You can now chat and start a video conference.`
          : "Your case request has been declined by the lawyer.",
        type: "request",
        relatedId: requestId,
      });
    }

    res.json({ ...updated });
  } catch (err) {
    console.error("Respond to request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
