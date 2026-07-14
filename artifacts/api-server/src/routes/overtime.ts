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
    effectiveTo: r.effectiveTo ?? null,
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

  const rows = await OvertimeRateModel.find(filter).sort({ effectiveFrom: -1 });
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
    effectiveTo: parsed.data.effectiveTo ?? null,
  });
  await logAudit(
    req.session.user,
    rate.branchId.toString(),
    "تحديث سعر الساعة الإضافية",
    `سعر جديد ${rate.ratePerHour} ساري من ${rate.effectiveFrom}${rate.effectiveTo ? ` حتى ${rate.effectiveTo}` : ""}`,
  );
  res.status(201).json(serialize(rate));
});

router.patch("/overtime-rates/:id", requireAuth, async (req, res): Promise<void> => {
  const { ratePerHour, effectiveFrom, effectiveTo } = req.body;
  const updates: any = {};
  if (ratePerHour !== undefined) updates.ratePerHour = Number(ratePerHour);
  if (effectiveFrom !== undefined) updates.effectiveFrom = effectiveFrom;
  if (effectiveTo !== undefined) updates.effectiveTo = effectiveTo;

  const rate = await OvertimeRateModel.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true }
  );
  if (!rate) {
    res.status(404).json({ error: "التسعيرة غير موجودة" });
    return;
  }
  await logAudit(
    req.session.user,
    rate.branchId.toString(),
    "تعديل سعر الساعة الإضافية",
    `تعديل التسعيرة: ${rate.ratePerHour} من ${rate.effectiveFrom}${rate.effectiveTo ? ` حتى ${rate.effectiveTo}` : ""}`,
  );
  res.json(serialize(rate));
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
