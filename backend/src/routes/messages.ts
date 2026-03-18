import { Router } from "express";
import { db } from "../db/index";
import {
  messagesTable,
  usersTable,
  lawyersTable,
  requestsTable,
} from "../db/schema/index";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { SendMessageBody } from "../generated/zod/index";

const router = Router();

// GET /api/conversations - Get all conversations for current user
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Get all conversations this user participates in
    const sentMessages = await db
      .selectDistinct({ conversationId: messagesTable.conversationId })
      .from(messagesTable)
      .where(eq(messagesTable.senderId, userId));

    const receivedMessages = await db
      .selectDistinct({ conversationId: messagesTable.conversationId })
      .from(messagesTable)
      .where(
        sql`${messagesTable.conversationId} ~ ${`(^|_)${userId}(_|$)`}`,
      );

    // Merge conversation IDs
    const convIds = new Set([
      ...sentMessages.map((m) => m.conversationId),
      ...receivedMessages.map((m) => m.conversationId),
    ]);

    const conversations = [];
    for (const convId of convIds) {
      // Parse participants from conversationId format: "user1_user2"
      const parts = convId.split("_");
      const otherUserId = parts.find((p) => p !== String(userId));
      if (!otherUserId) continue;

      const [otherUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, parseInt(otherUserId)))
        .limit(1);

      if (!otherUser) continue;

      // Get last message
      const [lastMsg] = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, convId))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      // Count unread
      const [unreadResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, convId),
            eq(messagesTable.isRead, false),
          ),
        );

      conversations.push({
        id: convId,
        participantId: otherUser.id,
        participantName: otherUser.name,
        participantRole: otherUser.role,
        participantImage: otherUser.profileImage,
        lastMessage: lastMsg?.content || null,
        lastMessageAt: lastMsg?.createdAt || null,
        unreadCount: Number(unreadResult?.count || 0),
      });
    }

    // Sort by last message
    conversations.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    res.json({ conversations });
  } catch (err) {
    console.error("Get conversations error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/messages/:conversationId
router.get("/:conversationId", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.userId;

    // Verify user is part of this conversation (exact segment match)
    if (!conversationId!.split("_").includes(String(userId))) {
      res.status(403).json({ error: "Not authorized for this conversation" });
      return;
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.conversationId, conversationId!))
      .orderBy(messagesTable.createdAt);

    // Mark messages as read
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(
        and(
          eq(messagesTable.conversationId, conversationId!),
          eq(messagesTable.isRead, false),
        ),
      );

    const formatted = messages.map(({ messages: msg, users }) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      content: msg.content,
      messageType: msg.messageType,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      sender: {
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

    res.json({ messages: formatted, total: formatted.length });
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/messages/:conversationId
router.post("/:conversationId", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.userId;
    const body = SendMessageBody.parse(req.body);

    // Verify user is part of this conversation (exact segment match)
    if (!conversationId!.split("_").includes(String(userId))) {
      res.status(403).json({ error: "Not authorized for this conversation" });
      return;
    }

    const [message] = await db
      .insert(messagesTable)
      .values({
        conversationId: conversationId!,
        senderId: userId,
        content: body.content,
        messageType: (body.messageType || "text") as "text" | "system" | "file",
        isRead: false,
      })
      .returning();

    const [sender] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    res.status(201).json({
      ...message,
      sender: sender
        ? {
            id: sender.id,
            email: sender.email,
            name: sender.name,
            role: sender.role,
            phone: sender.phone,
            location: sender.location,
            profileImage: sender.profileImage,
            createdAt: sender.createdAt,
          }
        : null,
    });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
