import { Router } from "express";
import { db } from "../db/index";
import { lawyersTable, usersTable, reviewsTable } from "../db/schema/index";
import { eq, and, gte, like, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import {
  GetLawyersQueryParams,
  UpdateLawyerProfileBody,
  UploadLicenseBody,
} from "../generated/zod/index";

const router = Router();

// Helper to build lawyer profile response
async function getLawyerWithUser(lawyerId: number) {
  const rows = await db
    .select()
    .from(lawyersTable)
    .innerJoin(usersTable, eq(lawyersTable.userId, usersTable.id))
    .where(eq(lawyersTable.id, lawyerId))
    .limit(1);

  if (!rows.length) return null;
  const { lawyers, users } = rows[0]!;
  return formatLawyerProfile(lawyers, users);
}

function formatLawyerProfile(
  lawyer: typeof lawyersTable.$inferSelect,
  user: typeof usersTable.$inferSelect,
) {
  return {
    id: lawyer.id,
    userId: lawyer.userId,
    name: user.name,
    email: user.email,
    specialization: lawyer.specialization,
    experience: lawyer.experience,
    location: lawyer.location,
    pricing: lawyer.pricing,
    bio: lawyer.bio,
    profileImage: user.profileImage,
    licenseDocument: lawyer.licenseDocument,
    approvalStatus: lawyer.approvalStatus,
    lawyerCode: lawyer.lawyerCode,
    rating: lawyer.rating,
    reviewCount: lawyer.reviewCount,
    isProfileComplete: lawyer.isProfileComplete,
    createdAt: lawyer.createdAt,
  };
}

// GET /api/lawyers
router.get("/", async (req, res) => {
  try {
    const query = GetLawyersQueryParams.parse(req.query);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Build filters - only approved lawyers visible
    const filters = [eq(lawyersTable.approvalStatus, "approved")];

    if (query.category) {
      filters.push(like(lawyersTable.specialization!, `%${query.category}%`));
    }
    if (query.location) {
      filters.push(like(lawyersTable.location!, `%${query.location}%`));
    }
    if (query.minRating) {
      filters.push(gte(lawyersTable.rating!, query.minRating));
    }

    const rows = await db
      .select()
      .from(lawyersTable)
      .innerJoin(usersTable, eq(lawyersTable.userId, usersTable.id))
      .where(and(...filters))
      .orderBy(desc(lawyersTable.rating))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(lawyersTable)
      .innerJoin(usersTable, eq(lawyersTable.userId, usersTable.id))
      .where(and(...filters));

    const total = Number(countResult[0]?.count || 0);

    const lawyers = rows.map(({ lawyers, users }) =>
      formatLawyerProfile(lawyers, users),
    );

    res.json({
      lawyers,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Get lawyers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/lawyers/profile - Current lawyer's profile (must be before /:lawyerId)
router.get("/profile", requireAuth, requireRole("lawyer"), async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(lawyersTable)
      .where(eq(lawyersTable.userId, req.user!.userId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Lawyer profile not found" });
      return;
    }

    const profile = await getLawyerWithUser(row.id);
    res.json(profile);
  } catch (err) {
    console.error("Get lawyer profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/lawyers/profile
router.put("/profile", requireAuth, requireRole("lawyer"), async (req, res) => {
  try {
    const body = UpdateLawyerProfileBody.parse(req.body);
    const userId = req.user!.userId;

    const [lawyer] = await db
      .select()
      .from(lawyersTable)
      .where(eq(lawyersTable.userId, userId))
      .limit(1);

    if (!lawyer) {
      res.status(404).json({ error: "Lawyer not found" });
      return;
    }

    const isProfileComplete = !!(
      body.specialization &&
      body.experience &&
      body.location &&
      body.pricing
    );

    // Update profile image on user table too
    if (body.profileImage) {
      await db
        .update(usersTable)
        .set({ profileImage: body.profileImage })
        .where(eq(usersTable.id, userId));
    }

    await db
      .update(lawyersTable)
      .set({
        ...(body.specialization !== undefined && { specialization: body.specialization }),
        ...(body.experience !== undefined && { experience: body.experience }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.pricing !== undefined && { pricing: body.pricing }),
        ...(body.bio !== undefined && { bio: body.bio }),
        isProfileComplete,
        updatedAt: new Date(),
      })
      .where(eq(lawyersTable.id, lawyer.id));

    const profile = await getLawyerWithUser(lawyer.id);
    res.json(profile);
  } catch (err) {
    console.error("Update lawyer profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/lawyers/upload-license
router.post("/upload-license", requireAuth, requireRole("lawyer"), async (req, res) => {
  try {
    const body = UploadLicenseBody.parse(req.body);
    const userId = req.user!.userId;

    await db
      .update(lawyersTable)
      .set({ licenseDocument: body.licenseUrl, updatedAt: new Date() })
      .where(eq(lawyersTable.userId, userId));

    res.json({ success: true, message: "License uploaded successfully" });
  } catch (err) {
    console.error("Upload license error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/lawyers/:lawyerId
router.get("/:lawyerId", async (req, res) => {
  try {
    const lawyerId = parseInt(req.params.lawyerId!);
    const profile = await getLawyerWithUser(lawyerId);

    if (!profile) {
      res.status(404).json({ error: "Lawyer not found" });
      return;
    }

    res.json(profile);
  } catch (err) {
    console.error("Get lawyer by id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/lawyers/:lawyerId/reviews
router.get("/:lawyerId/reviews", async (req, res) => {
  try {
    const lawyerId = parseInt(req.params.lawyerId!);

    const rows = await db
      .select()
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .where(eq(reviewsTable.lawyerId, lawyerId))
      .orderBy(desc(reviewsTable.createdAt));

    const reviews = rows.map(({ reviews, users }) => ({
      id: reviews.id,
      lawyerId: reviews.lawyerId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      user: { id: users.id, name: users.name, profileImage: users.profileImage },
    }));

    res.json({ reviews, total: reviews.length });
  } catch (err) {
    console.error("Get lawyer reviews error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
