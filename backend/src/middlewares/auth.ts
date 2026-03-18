import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; role: string };
    }
  }
}

// Middleware: require valid JWT
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyToken(token!);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
  }
}

// Middleware: require specific role
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden", message: "Insufficient permissions" });
      return;
    }
    next();
  };
}
