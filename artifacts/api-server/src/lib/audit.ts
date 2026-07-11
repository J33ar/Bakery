import { AuditLogModel } from "@workspace/db";
import type { SessionUser } from "./auth";

export async function logAudit(
  user: SessionUser | undefined,
  branchId: string | number | null,
  action: string,
  details?: string,
): Promise<void> {
  await AuditLogModel.create({
    userId: user?.id ? String(user.id) : null,
    branchId: branchId ? String(branchId) : null,
    action,
    details: details ?? null,
    date: new Date(),
  });
}
