import { Router } from "express";
import { db } from "../db/index";
import { reviewsTable, usersTable, lawyersTable } from "../db/schema/index";
import { eq, avg, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { CreateReviewBody } from "../generated/zod/index";

const router = Router();

// POST /api/reviews
router.post("/", requireAuth, requireRole("user"), async (req, res) => {
  try {
    const body = CreateReviewBody.parse(req.body);
    const userId = req.user!.userId;

    const [review] = await db
      .insert(reviewsTable)
      .values({
        lawyerId: body.lawyerId,
        userId,
        rating: body.rating,
        comment: body.comment,
      })
      .returning();

    // Update lawyer's average rating
    const [ratingResult] = await db
      .select({
        avgRating: avg(reviewsTable.rating),
        count: sql<number>`count(*)`,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.lawyerId, body.lawyerId));

    await db
      .update(lawyersTable)
      .set({
        rating: Number(ratingResult?.avgRating || 0),
        reviewCount: Number(ratingResult?.count || 0),
        updatedAt: new Date(),
      })
      .where(eq(lawyersTable.id, body.lawyerId));

    res.status(201).json({ ...review, user: null });
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
