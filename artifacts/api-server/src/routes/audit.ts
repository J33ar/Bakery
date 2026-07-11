import { Router, type IRouter } from "express";
import { AuditLogModel, UserModel } from "@workspace/db";
import { ListAuditLogsQueryParams } from "@workspace/api-zod";
import { effectiveBranchId, requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/audit-logs", requireAuth, async (req, res): Promise<void> => {
  const query = ListAuditLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const branchId = effectiveBranchId(req.session.user!, query.data.branchId as any);

  const filter: any = {};
  if (branchId) filter.branchId = String(branchId);

  const rows = await AuditLogModel.find(filter)
    .sort({ date: -1 })
    .limit(query.data.limit ?? 200);

  const results = [];
  for (const r of rows) {
    let userName: string | null = null;
    if (r.userId) {
      const user = await UserModel.findById(r.userId);
      userName = user?.fullName ?? null;
    }
    results.push({
      id: r._id.toString(),
      userId: r.userId?.toString() ?? null,
      userName,
      branchId: r.branchId?.toString() ?? null,
      action: r.action,
      details: r.details ?? null,
      date: r.date instanceof Date ? r.date.toISOString() : new Date().toISOString(),
    });
  }
  res.json(results);
});

export default router;
