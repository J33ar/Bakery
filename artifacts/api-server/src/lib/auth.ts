import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  branchId: string | null;
}

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

// ── JWT helpers ──────────────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set.");
  return secret;
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionUser;
  } catch {
    return null;
  }
}

// ── Password helpers ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Middleware ───────────────────────────────────────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // 1. JWT من Authorization header (للـ production / cross-origin)
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    if (user) {
      req.session.user = user;
      return next();
    }
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }

  // 2. Session cookie (للتطوير المحلي)
  if (req.session.user) {
    return next();
  }

  res.status(401).json({ error: "غير مصرح بالدخول" });
}

/**
 * Returns the effective branch filter for the current user:
 * - general_manager: whatever branchId was requested (or undefined = all branches)
 * - branch_manager: always locked to their own branch, ignoring any requested branchId
 */
export function effectiveBranchId(
  user: SessionUser,
  requestedBranchId: string | undefined,
): string | undefined {
  if (user.role === "branch_manager") {
    return user.branchId ?? undefined;
  }
  return requestedBranchId;
}
