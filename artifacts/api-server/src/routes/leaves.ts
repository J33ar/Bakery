import { Router, type IRouter } from "express";
import { LeaveModel, EmployeeModel } from "@workspace/db";
import {
  ListLeavesQueryParams,
  CreateLeaveBody,
  UpdateLeaveParams,
  UpdateLeaveBody,
  DeleteLeaveParams,
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
    type: l.type,
    startDate: l.startDate,
    endDate: l.endDate,
    days: l.days,
    paid: l.paid,
    status: l.status,
    reason: l.reason ?? null,
  };
}

router.get("/leaves", requireAuth, async (req, res): Promise<void> => {
  const query = ListLeavesQueryParams.safeParse(req.query);
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
  if (query.data.status) filter.status = query.data.status;

  let rows = await LeaveModel.find(filter);
  if (employeeIds) {
    rows = rows.filter((r: any) => employeeIds!.includes(r.employeeId.toString()));
  }

  // فلترة السجلات اليتيمة (موظفون محذوفون)
  const allEmployeeIds = (await EmployeeModel.find({}).select("_id")).map((e: any) => e._id.toString());
  rows = rows.filter((r: any) => allEmployeeIds.includes(r.employeeId.toString()));

  res.json(await Promise.all(rows.map(serialize)));
});

router.post("/leaves", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLeaveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const leave = await LeaveModel.create({
    ...parsed.data,
    status: "pending",
    paid: parsed.data.paid ?? true,
  });
  await logAudit(req.session.user, null, "طلب إجازة", `طلب إجازة جديد للموظف ${leave.employeeId}`);
  res.status(201).json(await serialize(leave));
});

router.patch("/leaves/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateLeaveParams.safeParse(req.params);
  const body = UpdateLeaveBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: formatZodError((params.error ?? body.error)!) });
    return;
  }
  const leave = await LeaveModel.findByIdAndUpdate(params.data.id, body.data, { new: true });
  if (!leave) {
    res.status(404).json({ error: "طلب الإجازة غير موجود" });
    return;
  }
  await logAudit(req.session.user, null, "تحديث إجازة", `تحديث حالة الإجازة ${params.data.id} إلى ${leave.status}`);
  res.json(await serialize(leave));
});

router.delete("/leaves/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteLeaveParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const leave = await LeaveModel.findByIdAndDelete(params.data.id);
  if (!leave) {
    res.status(404).json({ error: "طلب الإجازة غير موجود" });
    return;
  }
  await logAudit(req.session.user, null, "حذف إجازة", `حذف طلب إجازة ${params.data.id}`);
  res.status(204).send();
});

export default router;
