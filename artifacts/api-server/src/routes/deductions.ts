import { Router, type IRouter } from "express";
import { DeductionModel, EmployeeModel } from "@workspace/db";
import { ListDeductionsQueryParams, CreateDeductionBody, DeleteDeductionParams } from "@workspace/api-zod";
import { effectiveBranchId, requireAuth } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { formatZodError } from "../lib/zodError";

const router: IRouter = Router();

async function serialize(d: any) {
  const employee = await EmployeeModel.findById(d.employeeId);
  return {
    id: d._id.toString(),
    employeeId: d.employeeId.toString(),
    employeeName: employee?.fullName ?? "",
    branchId: employee?.branchId?.toString() ?? "",
    amount: Number(d.amount),
    reason: d.reason,
    date: d.date,
  };
}

router.get("/deductions", requireAuth, async (req, res): Promise<void> => {
  const query = ListDeductionsQueryParams.safeParse(req.query);
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

  let rows = await DeductionModel.find(filter);
  if (employeeIds) {
    rows = rows.filter((r: any) => employeeIds!.includes(r.employeeId.toString()));
  }
  res.json(await Promise.all(rows.map(serialize)));
});

router.post("/deductions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDeductionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const deduction = await DeductionModel.create({ ...parsed.data, amount: Number(parsed.data.amount) });
  await logAudit(req.session.user, null, "إضافة خصم", `خصم ${deduction.amount} للموظف ${deduction.employeeId}`);
  res.status(201).json(await serialize(deduction));
});

router.delete("/deductions/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteDeductionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const deduction = await DeductionModel.findByIdAndDelete(params.data.id);
  if (!deduction) {
    res.status(404).json({ error: "الخصم غير موجود" });
    return;
  }
  await logAudit(req.session.user, null, "حذف خصم", `حذف خصم ${params.data.id}`);
  res.status(204).send();
});

export default router;
