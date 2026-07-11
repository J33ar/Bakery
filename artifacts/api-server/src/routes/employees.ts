import { Router, type IRouter } from "express";
import {
  EmployeeModel,
  BranchModel,
  AttendanceModel,
  LeaveModel,
  BonusModel,
  DeductionModel,
  LoanModel,
  PayrollModel,
} from "@workspace/db";
import {
  ListEmployeesQueryParams,
  CreateEmployeeBody,
  GetEmployeeParams,
  UpdateEmployeeParams,
  UpdateEmployeeBody,
  DeleteEmployeeParams,
  GetEmployeeFullRecordParams,
} from "@workspace/api-zod";
import { effectiveBranchId, requireAuth } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { formatZodError } from "../lib/zodError";

const router: IRouter = Router();

async function serialize(employee: any) {
  const branch = await BranchModel.findById(employee.branchId);
  return {
    id: employee._id.toString(),
    fullName: employee.fullName,
    employeeNumber: employee.employeeNumber,
    phone: employee.phone ?? null,
    address: employee.address ?? null,
    nationalId: employee.nationalId ?? null,
    birthDate: employee.birthDate ?? null,
    hireDate: employee.hireDate,
    branchId: employee.branchId.toString(),
    branchName: branch?.name ?? null,
    department: employee.department,
    jobTitle: employee.jobTitle,
    baseSalary: Number(employee.baseSalary),
    contractType: employee.contractType,
    photoUrl: employee.photoUrl ?? null,
    status: employee.status,
    createdAt: employee.createdAt instanceof Date
      ? employee.createdAt.toISOString()
      : new Date().toISOString(),
  };
}

router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  const query = ListEmployeesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: formatZodError(query.error) });
    return;
  }
  const branchId = effectiveBranchId(req.session.user!, query.data.branchId as any);

  const filter: any = {};
  if (branchId) filter.branchId = String(branchId);
  if (query.data.status) filter.status = query.data.status;
  if (query.data.search) {
    filter.$or = [
      { fullName: { $regex: query.data.search, $options: "i" } },
      { employeeNumber: { $regex: query.data.search, $options: "i" } },
    ];
  }

  const rows = await EmployeeModel.find(filter);
  res.json(await Promise.all(rows.map(serialize)));
});

router.post("/employees", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  // التحقق من عدم تكرار الرقم الوظيفي
  const existing = await EmployeeModel.findOne({ employeeNumber: parsed.data.employeeNumber });
  if (existing) {
    res.status(400).json({ error: `الرقم الوظيفي "${parsed.data.employeeNumber}" مستخدم بالفعل — يرجى اختيار رقم آخر` });
    return;
  }

  const employee = await EmployeeModel.create({
    ...parsed.data,
    baseSalary: Number(parsed.data.baseSalary),
    status: parsed.data.status ?? "active",
  });

  await logAudit(req.session.user, employee.branchId.toString(), "إضافة موظف", `تمت إضافة الموظف ${employee.fullName}`);
  res.status(201).json(await serialize(employee));
});

router.get("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const employee = await EmployeeModel.findById(params.data.id);
  if (!employee) {
    res.status(404).json({ error: "الموظف غير موجود" });
    return;
  }
  res.json(await serialize(employee));
});

router.patch("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateEmployeeParams.safeParse(req.params);
  const body = UpdateEmployeeBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: formatZodError((params.error ?? body.error)!) });
    return;
  }
  const updates: any = { ...body.data };
  if (updates.baseSalary !== undefined) updates.baseSalary = Number(updates.baseSalary);

  // التحقق من عدم تكرار الرقم الوظيفي عند التعديل
  if (updates.employeeNumber) {
    const duplicate = await EmployeeModel.findOne({
      employeeNumber: updates.employeeNumber,
      _id: { $ne: params.data.id }
    });
    if (duplicate) {
      res.status(400).json({ error: `الرقم الوظيفي "${updates.employeeNumber}" مستخدم بالفعل لموظف آخر` });
      return;
    }
  }

  const employee = await EmployeeModel.findByIdAndUpdate(
    params.data.id,
    updates,
    { new: true },
  );
  if (!employee) {
    res.status(404).json({ error: "الموظف غير موجود" });
    return;
  }
  await logAudit(req.session.user, employee.branchId.toString(), "تعديل موظف", `تم تعديل بيانات الموظف ${employee.fullName}`);
  res.json(await serialize(employee));
});

router.delete("/employees/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteEmployeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const employee = await EmployeeModel.findByIdAndDelete(params.data.id);
  if (!employee) {
    res.status(404).json({ error: "الموظف غير موجود" });
    return;
  }

  // حذف جميع البيانات المرتبطة بالموظف
  const empId = employee._id.toString();
  await Promise.all([
    AttendanceModel.deleteMany({ employeeId: empId }),
    LeaveModel.deleteMany({ employeeId: empId }),
    BonusModel.deleteMany({ employeeId: empId }),
    DeductionModel.deleteMany({ employeeId: empId }),
    LoanModel.deleteMany({ employeeId: empId }),
    PayrollModel.deleteMany({ employeeId: empId }),
  ]);

  await logAudit(req.session.user, employee.branchId.toString(), "حذف موظف", `تم حذف الموظف ${employee.fullName} وجميع بياناته`);
  res.status(204).send();
});

router.get("/employees/:id/full-record", requireAuth, async (req, res): Promise<void> => {
  const params = GetEmployeeFullRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const employee = await EmployeeModel.findById(params.data.id);
  if (!employee) {
    res.status(404).json({ error: "الموظف غير موجود" });
    return;
  }

  const empId = employee._id.toString();
  const [attendance, leaves, bonuses, deductions, loans, payroll] = await Promise.all([
    AttendanceModel.find({ employeeId: empId }),
    LeaveModel.find({ employeeId: empId }),
    BonusModel.find({ employeeId: empId }),
    DeductionModel.find({ employeeId: empId }),
    LoanModel.find({ employeeId: empId }),
    PayrollModel.find({ employeeId: empId }),
  ]);

  res.json({
    employee: await serialize(employee),
    attendance: attendance.map((a: any) => ({
      id: a._id.toString(),
      employeeId: a.employeeId.toString(),
      employeeName: employee.fullName,
      branchId: employee.branchId.toString(),
      date: a.date,
      checkIn: a.checkIn,
      checkOut: a.checkOut,
      workMinutes: a.workMinutes,
      overtimeMinutes: a.overtimeMinutes,
      lateMinutes: a.lateMinutes,
      earlyLeaveMinutes: a.earlyLeaveMinutes,
      notes: a.notes,
      status: a.status,
    })),
    leaves: leaves.map((l: any) => ({
      id: l._id.toString(),
      employeeId: l.employeeId.toString(),
      employeeName: employee.fullName,
      type: l.type,
      startDate: l.startDate,
      endDate: l.endDate,
      days: l.days,
      paid: l.paid,
      status: l.status,
      reason: l.reason,
    })),
    bonuses: bonuses.map((b: any) => ({
      id: b._id.toString(),
      employeeId: b.employeeId.toString(),
      employeeName: employee.fullName,
      amount: Number(b.amount),
      reason: b.reason,
      date: b.date,
    })),
    deductions: deductions.map((d: any) => ({
      id: d._id.toString(),
      employeeId: d.employeeId.toString(),
      employeeName: employee.fullName,
      amount: Number(d.amount),
      reason: d.reason,
      date: d.date,
    })),
    loans: loans.map((l: any) => ({
      id: l._id.toString(),
      employeeId: l.employeeId.toString(),
      employeeName: employee.fullName,
      amount: Number(l.amount),
      installment: Number(l.installment),
      remaining: Number(l.remaining),
      date: l.date,
    })),
    payroll: payroll.map((p: any) => ({
      id: p._id.toString(),
      employeeId: p.employeeId.toString(),
      employeeName: employee.fullName,
      branchId: employee.branchId.toString(),
      month: p.month,
      year: p.year,
      baseSalary: Number(p.baseSalary),
      accruedSalary: Number(p.accruedSalary),
      overtimeAmount: Number(p.overtimeAmount),
      bonusesAmount: Number(p.bonusesAmount),
      deductionsAmount: Number(p.deductionsAmount),
      loanDeduction: Number(p.loanDeduction),
      absenceDeduction: Number(p.absenceDeduction),
      finalAmount: Number(p.finalAmount),
      status: p.status,
      generatedAt: p.generatedAt instanceof Date ? p.generatedAt.toISOString() : new Date().toISOString(),
    })),
  });
});

export default router;
