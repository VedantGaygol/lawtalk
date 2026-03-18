import { Router } from "express";
import { db } from "../db/index";
import { usersTable } from "../db/schema/index";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { UpdateUserProfileBody } from "../generated/zod/index";

const router = Router();

// PUT /api/users/profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const body = UpdateUserProfileBody.parse(req.body);
    const userId = req.user!.userId;

    const [updated] = await db
      .update(usersTable)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.profileImage !== undefined && { profileImage: body.profileImage }),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      phone: updated.phone,
      location: updated.location,
      profileImage: updated.profileImage,
      createdAt: updated.createdAt,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
