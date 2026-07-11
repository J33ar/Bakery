import { Router, type IRouter } from "express";
import { OvertimeRateModel } from "@workspace/db";
import { ListOvertimeRatesQueryParams, CreateOvertimeRateBody } from "@workspace/api-zod";
import { effectiveBranchId, requireAuth } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { formatZodError } from "../lib/zodError";

const router: IRouter = Router();

function serialize(r: any) {
  return {
    id: r._id.toString(),
    branchId: r.branchId.toString(),
    ratePerHour: Number(r.ratePerHour),
    effectiveFrom: r.effectiveFrom,
  };
}

router.get("/overtime-rates", requireAuth, async (req, res): Promise<void> => {
  const query = ListOvertimeRatesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: formatZodError(query.error) });
    return;
  }
  const branchId = effectiveBranchId(req.session.user!, query.data.branchId as any);

  const filter: any = {};
  if (branchId) filter.branchId = String(branchId);

  const rows = await OvertimeRateModel.find(filter);
  res.json(rows.map(serialize));
});

router.post("/overtime-rates", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateOvertimeRateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const rate = await OvertimeRateModel.create({
    ...parsed.data,
    ratePerHour: Number(parsed.data.ratePerHour),
  });
  await logAudit(
    req.session.user,
    rate.branchId.toString(),
    "تحديث سعر الساعة الإضافية",
    `سعر جديد ${rate.ratePerHour} ساري من ${rate.effectiveFrom}`,
  );
  res.status(201).json(serialize(rate));
});

router.delete("/overtime-rates/:id", requireAuth, async (req, res): Promise<void> => {
  const rate = await OvertimeRateModel.findByIdAndDelete(req.params.id);
  if (!rate) {
    res.status(404).json({ error: "التسعيرة غير موجودة" });
    return;
  }
  await logAudit(req.session.user, rate.branchId.toString(), "حذف تسعيرة إضافي", `حذف تسعيرة ${rate.ratePerHour} للفرع ${rate.branchId}`);
  res.status(204).send();
});

export default router;
