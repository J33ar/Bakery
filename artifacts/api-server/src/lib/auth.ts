import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";

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

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }
  next();
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
