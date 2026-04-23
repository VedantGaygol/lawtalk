import { Router } from "express";
import { db } from "../db/index";
import { reviewsTable, usersTable, lawyersTable, casesTable } from "../db/schema/index";
import { eq, avg, sql, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// POST /api/reviews
router.post("/", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const { lawyerId, caseId, rating, comment } = req.body as {
      lawyerId: number; caseId: number; rating: number; comment?: string;
    };
    const userId = req.user!.userId;

    if (!lawyerId || !caseId || !rating) {
      res.status(400).json({ error: "lawyerId, caseId and rating are required" }); return;
    }
    if (rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating must be between 1 and 5" }); return;
    }

    // Case must be resolved and belong to this user
    const [caseItem] = await db.select().from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)))
      .limit(1);
    if (!caseItem) { res.status(404).json({ error: "Case not found" }); return; }
    if (caseItem.status !== "resolved") {
      res.status(403).json({ error: "You can only review a lawyer after the case is resolved" }); return;
    }
    if (caseItem.assignedLawyerId !== lawyerId) {
      res.status(403).json({ error: "This lawyer was not assigned to this case" }); return;
    }

    // Prevent duplicate review for same case
    const [existing] = await db.select().from(reviewsTable)
      .where(and(
        eq(reviewsTable.userId, userId),
        eq(reviewsTable.lawyerId, lawyerId),
        eq(reviewsTable.caseId, caseId)
      ))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "You have already reviewed this case" }); return;
    }

    const [review] = await db.insert(reviewsTable)
      .values({ lawyerId, userId, caseId, rating, comment })
      .returning();

    // Recalculate lawyer average rating
    const [ratingResult] = await db
      .select({ avgRating: avg(reviewsTable.rating), count: sql<number>`count(*)` })
      .from(reviewsTable)
      .where(eq(reviewsTable.lawyerId, lawyerId));

    await db.update(lawyersTable)
      .set({ rating: Number(ratingResult?.avgRating || 0), reviewCount: Number(ratingResult?.count || 0), updatedAt: new Date() })
      .where(eq(lawyersTable.id, lawyerId));

    res.status(201).json(review);
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/reviews/:lawyerId
router.get("/:lawyerId", async (req, res) => {
  try {
    const lawyerId = parseInt(req.params.lawyerId!);

    const rows = await db
      .select()
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .where(eq(reviewsTable.lawyerId, lawyerId))
      .orderBy(reviewsTable.createdAt);

    const [ratingResult] = await db
      .select({ avgRating: avg(reviewsTable.rating) })
      .from(reviewsTable)
      .where(eq(reviewsTable.lawyerId, lawyerId));

    const reviews = rows.map(({ reviews, users }) => ({
      id: reviews.id,
      lawyerId: reviews.lawyerId,
      userId: reviews.userId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        phone: users.phone,
        location: users.location,
        profileImage: users.profileImage,
        createdAt: users.createdAt,
      },
    }));

    res.json({
      reviews,
      averageRating: Number(ratingResult?.avgRating || 0),
      total: reviews.length,
    });
  } catch (err) {
    console.error("Get reviews error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
