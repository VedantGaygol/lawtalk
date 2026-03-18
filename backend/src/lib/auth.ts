import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env["JWT_SECRET"] || "lawtalk-secret-key-dev";
const JWT_EXPIRES_IN = "7d";

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare password with hash
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate a JWT token
export function generateToken(payload: {
  userId: number;
  role: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
export function verifyToken(token: string): { userId: number; role: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
}

// Generate unique lawyer code
export function generateLawyerCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "LT-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
