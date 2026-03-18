import { Router } from "express";
import { db } from "../db/index";
import { usersTable, lawyersTable } from "../db/schema/index";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateLawyerCode,
} from "../lib/auth";
import { requireAuth } from "../middlewares/auth";
import {
  RegisterUserBody,
  LoginUserBody,
} from "../generated/zod/index";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const body = RegisterUserBody.parse(req.body);
    const { email, password, name, role } = body;

    // Check if user already exists
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(usersTable)
      .values({ email, passwordHash, name, role: role as "user" | "lawyer" | "admin" })
      .returning();

    // If registering as lawyer, create lawyer record
    if (role === "lawyer") {
      const lawyerCode = generateLawyerCode();
      await db.insert(lawyersTable).values({
        userId: user!.id,
        lawyerCode,
        approvalStatus: "pending",
      });
    }

    const token = generateToken({ userId: user!.id, role: user!.role });

    res.status(201).json({
      token,
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
        phone: user!.phone,
        location: user!.location,
        profileImage: user!.profileImage,
        createdAt: user!.createdAt,
      },
    });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "issues" in err) {
      res.status(400).json({ error: "Validation error", message: String(err) });
    } else {
      console.error("Register error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const body = LoginUserBody.parse(req.body);
    const { email, password } = body;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = generateToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        location: user.location,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      location: user.location,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
