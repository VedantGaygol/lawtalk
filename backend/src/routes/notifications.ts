import { Router } from "express";
import { db } from "../db/index";
import { notificationsTable } from "../db/schema/index";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// GET /api/notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(notificationsTable.createdAt);

    const [unreadResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, userId),
          eq(notificationsTable.isRead, false),
        ),
      );

    res.json({
      notifications,
      unreadCount: Number(unreadResult?.count || 0),
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/notifications/:notificationId/read
router.put("/:notificationId/read", requireAuth, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.notificationId!);
    const userId = req.user!.userId;

    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.userId, userId),
        ),
      );

    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
