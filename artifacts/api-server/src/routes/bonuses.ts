import { Router, type IRouter } from "express";
import { BonusModel, EmployeeModel } from "@workspace/db";
import { ListBonusesQueryParams, CreateBonusBody, DeleteBonusParams } from "@workspace/api-zod";
import { effectiveBranchId, requireAuth } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { formatZodError } from "../lib/zodError";

const router: IRouter = Router();

async function serialize(b: any) {
  const employee = await EmployeeModel.findById(b.employeeId);
  return {
    id: b._id.toString(),
    employeeId: b.employeeId.toString(),
    employeeName: employee?.fullName ?? "",
    branchId: employee?.branchId?.toString() ?? "",
    amount: Number(b.amount),
    reason: b.reason,
    date: b.date,
  };
}

router.get("/bonuses", requireAuth, async (req, res): Promise<void> => {
  const query = ListBonusesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: formatZodError(query.error) });
    return;
  }
  const branchId = effectiveBranchId(req.session.user!, query.data.branchId as any);
  let employeeIds: string[] | undefined;
  if (branchId) {
    const employees = await EmployeeModel.find({ branchId: String(branchId) });
    employeeIds = employees.map((e: any) => e._id.toString());
  }

  const filter: any = {};
  if (query.data.employeeId) filter.employeeId = String(query.data.employeeId);

  let rows = await BonusModel.find(filter);
  if (employeeIds) {
    rows = rows.filter((r: any) => employeeIds!.includes(r.employeeId.toString()));
  }
  res.json(await Promise.all(rows.map(serialize)));
});

router.post("/bonuses", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateBonusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const bonus = await BonusModel.create({ ...parsed.data, amount: Number(parsed.data.amount) });
  await logAudit(req.session.user, null, "إضافة مكافأة", `مكافأة ${bonus.amount} للموظف ${bonus.employeeId}`);
  res.status(201).json(await serialize(bonus));
});

router.delete("/bonuses/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteBonusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const bonus = await BonusModel.findByIdAndDelete(params.data.id);
  if (!bonus) {
    res.status(404).json({ error: "المكافأة غير موجودة" });
    return;
  }
  await logAudit(req.session.user, null, "حذف مكافأة", `حذف مكافأة ${params.data.id}`);
  res.status(204).send();
});

export default router;
