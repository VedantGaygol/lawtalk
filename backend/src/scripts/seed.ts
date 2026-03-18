import "dotenv/config";
/**
 * Seed script for LawTalk platform
 * Run with: pnpm --filter @workspace/scripts run seed
 */
import { db } from "../db/index.js";
import {
  usersTable,
  lawyersTable,
  casesTable,
  requestsTable,
  reviewsTable,
  notificationsTable,
} from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding LawTalk database...");

  const password = await bcrypt.hash("password123", 10);

  // Create admin user
  const [admin] = await db
    .insert(usersTable)
    .values({
      email: "admin@lawtalk.com",
      passwordHash: password,
      name: "Admin User",
      role: "admin",
    })
    .onConflictDoNothing()
    .returning();

  console.log("✅ Admin created:", admin?.email || "already exists");

  // Create regular users
  const users = await db
    .insert(usersTable)
    .values([
      {
        email: "alice@example.com",
        passwordHash: password,
        name: "Alice Johnson",
        role: "user",
        location: "Mumbai, Maharashtra",
        phone: "+91 98765 43210",
      },
      {
        email: "bob@example.com",
        passwordHash: password,
        name: "Bob Kumar",
        role: "user",
        location: "Delhi, NCR",
        phone: "+91 87654 32109",
      },
    ])
    .onConflictDoNothing()
    .returning();

  console.log("✅ Users seeded:", users.length);

  // Create lawyer users
  const lawyerUsers = await db
    .insert(usersTable)
    .values([
      {
        email: "vikram@lawtalk.com",
        passwordHash: password,
        name: "Vikram Sharma",
        role: "lawyer",
        location: "Mumbai, Maharashtra",
        phone: "+91 91234 56789",
      },
      {
        email: "priya@lawtalk.com",
        passwordHash: password,
        name: "Priya Mehta",
        role: "lawyer",
        location: "Delhi, NCR",
        phone: "+91 90123 45678",
      },
      {
        email: "rajesh@lawtalk.com",
        passwordHash: password,
        name: "Rajesh Gupta",
        role: "lawyer",
        location: "Bangalore, Karnataka",
        phone: "+91 89012 34567",
      },
      {
        email: "kavita@lawtalk.com",
        passwordHash: password,
        name: "Kavita Nair",
        role: "lawyer",
        location: "Chennai, Tamil Nadu",
        phone: "+91 78901 23456",
      },
    ])
    .onConflictDoNothing()
    .returning();

  console.log("✅ Lawyer users seeded:", lawyerUsers.length);

  // Fetch existing users for reference
  const allUsers = await db.select().from(usersTable);
  const getUser = (email: string) => allUsers.find((u) => u.email === email);

  const vikramUser = getUser("vikram@lawtalk.com");
  const priyaUser = getUser("priya@lawtalk.com");
  const rajeshUser = getUser("rajesh@lawtalk.com");
  const kavitaUser = getUser("kavita@lawtalk.com");
  const aliceUser = getUser("alice@example.com");
  const bobUser = getUser("bob@example.com");

  // Create lawyer profiles
  const lawyerProfiles = [];
  if (vikramUser) {
    const [l] = await db
      .insert(lawyersTable)
      .values({
        userId: vikramUser.id,
        specialization: "Criminal Law",
        experience: 12,
        location: "Mumbai, Maharashtra",
        pricing: 5000,
        bio: "Senior criminal defense attorney with 12+ years of experience. Successfully handled 500+ cases including high-profile criminal matters.",
        approvalStatus: "approved",
        lawyerCode: "LT-VK1234",
        rating: 4.8,
        reviewCount: 47,
        isProfileComplete: true,
      })
      .onConflictDoNothing()
      .returning();
    if (l) lawyerProfiles.push(l);
  }

  if (priyaUser) {
    const [l] = await db
      .insert(lawyersTable)
      .values({
        userId: priyaUser.id,
        specialization: "Family Law",
        experience: 8,
        location: "Delhi, NCR",
        pricing: 3500,
        bio: "Family law specialist focusing on divorce, custody, and matrimonial disputes. Compassionate approach with focus on amicable resolution.",
        approvalStatus: "approved",
        lawyerCode: "LT-PM5678",
        rating: 4.6,
        reviewCount: 32,
        isProfileComplete: true,
      })
      .onConflictDoNothing()
      .returning();
    if (l) lawyerProfiles.push(l);
  }

  if (rajeshUser) {
    const [l] = await db
      .insert(lawyersTable)
      .values({
        userId: rajeshUser.id,
        specialization: "Corporate Law",
        experience: 15,
        location: "Bangalore, Karnataka",
        pricing: 8000,
        bio: "Corporate law expert specializing in mergers, acquisitions, contracts, and startup legal compliance. Served 100+ corporate clients.",
        approvalStatus: "approved",
        lawyerCode: "LT-RG9012",
        rating: 4.9,
        reviewCount: 61,
        isProfileComplete: true,
      })
      .onConflictDoNothing()
      .returning();
    if (l) lawyerProfiles.push(l);
  }

  if (kavitaUser) {
    const [l] = await db
      .insert(lawyersTable)
      .values({
        userId: kavitaUser.id,
        specialization: "Property Law",
        experience: 10,
        location: "Chennai, Tamil Nadu",
        pricing: 4000,
        bio: "Property and real estate law specialist. Expert in property disputes, documentation, RERA compliance, and tenancy law.",
        approvalStatus: "pending",
        lawyerCode: "LT-KN3456",
        rating: null,
        reviewCount: 0,
        isProfileComplete: true,
      })
      .onConflictDoNothing()
      .returning();
    if (l) lawyerProfiles.push(l);
  }

  console.log("✅ Lawyer profiles seeded:", lawyerProfiles.length);

  // Create cases
  if (aliceUser && lawyerProfiles[0]) {
    const cases = await db
      .insert(casesTable)
      .values([
        {
          title: "Wrongful termination dispute",
          description:
            "I was terminated from my job without proper notice or cause. My employer violated the terms of my employment contract.",
          category: "Labour Law",
          location: "Mumbai, Maharashtra",
          budget: 20000,
          status: "in_progress",
          userId: aliceUser.id,
          assignedLawyerId: lawyerProfiles[0]!.id,
        },
        {
          title: "Property ownership dispute",
          description:
            "Neighbor has encroached on my property. Need legal help to reclaim my land and establish clear boundary.",
          category: "Property Law",
          location: "Mumbai, Maharashtra",
          budget: 15000,
          status: "open",
          userId: aliceUser.id,
        },
      ])
      .onConflictDoNothing()
      .returning();

    console.log("✅ Cases seeded:", cases.length);
  }

  if (bobUser && lawyerProfiles[1]) {
    await db
      .insert(casesTable)
      .values({
        title: "Divorce proceedings",
        description:
          "Seeking divorce on grounds of irreconcilable differences. Need guidance on asset division and child custody.",
        category: "Family Law",
        location: "Delhi, NCR",
        budget: 25000,
        status: "in_progress",
        userId: bobUser.id,
        assignedLawyerId: lawyerProfiles[1]!.id,
      })
      .onConflictDoNothing();
  }

  // Create notifications
  if (vikramUser) {
    await db
      .insert(notificationsTable)
      .values([
        {
          userId: vikramUser.id,
          title: "Application Approved",
          message:
            "Congratulations! Your lawyer application has been approved. You can now access your dashboard.",
          type: "approval",
          isRead: true,
        },
        {
          userId: vikramUser.id,
          title: "New Case Request",
          message: "You have a new case request from Alice Johnson",
          type: "request",
          isRead: false,
        },
      ])
      .onConflictDoNothing();
  }

  if (aliceUser) {
    await db
      .insert(notificationsTable)
      .values({
        userId: aliceUser.id,
        title: "Request Accepted",
        message: "Vikram Sharma has accepted your case request",
        type: "request",
        isRead: false,
      })
      .onConflictDoNothing();
  }

  console.log("✅ Notifications seeded");
  console.log("\n🎉 Seeding complete!\n");
  console.log("Test accounts:");
  console.log("  Admin:  admin@lawtalk.com / password123");
  console.log("  User:   alice@example.com / password123");
  console.log("  User:   bob@example.com / password123");
  console.log("  Lawyer: vikram@lawtalk.com / password123 (approved)");
  console.log("  Lawyer: priya@lawtalk.com / password123 (approved)");
  console.log("  Lawyer: rajesh@lawtalk.com / password123 (approved)");
  console.log("  Lawyer: kavita@lawtalk.com / password123 (pending)");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
