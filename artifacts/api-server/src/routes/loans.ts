import { Router, type IRouter } from "express";
import { LoanModel, EmployeeModel } from "@workspace/db";
import {
  ListLoansQueryParams,
  CreateLoanBody,
  UpdateLoanParams,
  UpdateLoanBody,
  DeleteLoanParams,
} from "@workspace/api-zod";
import { effectiveBranchId, requireAuth } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { formatZodError } from "../lib/zodError";

const router: IRouter = Router();

async function serialize(l: any) {
  const employee = await EmployeeModel.findById(l.employeeId);
  return {
    id: l._id.toString(),
    employeeId: l.employeeId.toString(),
    employeeName: employee?.fullName ?? "",
    branchId: employee?.branchId?.toString() ?? "",
    amount: Number(l.amount),
    date: l.date,
    installment: Number(l.installment),
    remaining: Number(l.remaining),
  };
}

router.get("/loans", requireAuth, async (req, res): Promise<void> => {
  const query = ListLoansQueryParams.safeParse(req.query);
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

  let rows = await LoanModel.find(filter);
  if (employeeIds) {
    rows = rows.filter((r: any) => employeeIds!.includes(r.employeeId.toString()));
  }

  // فلترة السجلات اليتيمة (موظفون محذوفون)
  const allEmployeeIds = (await EmployeeModel.find({}).select("_id")).map((e: any) => e._id.toString());
  rows = rows.filter((r: any) => allEmployeeIds.includes(r.employeeId.toString()));

  res.json(await Promise.all(rows.map(serialize)));
});

router.post("/loans", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const loan = await LoanModel.create({
    ...parsed.data,
    amount: Number(parsed.data.amount),
    installment: Number(parsed.data.installment),
    remaining: Number(parsed.data.amount),
  });
  await logAudit(req.session.user, null, "إضافة سلفة", `سلفة ${loan.amount} للموظف ${loan.employeeId}`);
  res.status(201).json(await serialize(loan));
});

router.patch("/loans/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLoanParams.safeParse(req.params);
  const body = UpdateLoanBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: formatZodError((params.error ?? body.error)!) });
    return;
  }
  const updates: any = {};
  if (body.data.installment !== undefined) updates.installment = Number(body.data.installment);
  if (body.data.remaining !== undefined) updates.remaining = Number(body.data.remaining);

  const loan = await LoanModel.findByIdAndUpdate(params.data.id, updates, { new: true });
  if (!loan) {
    res.status(404).json({ error: "السلفة غير موجودة" });
    return;
  }
  await logAudit(req.session.user, null, "تعديل سلفة", `تعديل سلفة ${params.data.id}`);
  res.json(await serialize(loan));
});

router.delete("/loans/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const loan = await LoanModel.findByIdAndDelete(params.data.id);
  if (!loan) {
    res.status(404).json({ error: "السلفة غير موجودة" });
    return;
  }
  await logAudit(req.session.user, null, "حذف سلفة", `حذف سلفة ${params.data.id}`);
  res.status(204).send();
});

export default router;
