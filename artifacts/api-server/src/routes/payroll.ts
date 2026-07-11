import { Router, type IRouter } from "express";
import { PayrollModel, EmployeeModel, LoanModel } from "@workspace/db";
import {
  ListPayrollQueryParams,
  GeneratePayrollBody,
  GetCurrentPayrollParams,
} from "@workspace/api-zod";
import { effectiveBranchId, requireAuth } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { calculatePayroll } from "../lib/payrollCalc";
import { formatZodError } from "../lib/zodError";

const router: IRouter = Router();

async function serialize(p: any) {
  const employee = await EmployeeModel.findById(p.employeeId);
  return {
    id: p._id.toString(),
    employeeId: p.employeeId.toString(),
    employeeName: employee?.fullName ?? "",
    branchId: employee?.branchId?.toString() ?? "",
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
    generatedAt: p.generatedAt instanceof Date
      ? p.generatedAt.toISOString()
      : new Date().toISOString(),
  };
}

async function generatePayrollRecord(employeeId: string, year: number, month: number) {
  const calc = await calculatePayroll(employeeId, year, month);
  const existing = await PayrollModel.findOne({ employeeId, month, year });
  if (existing) {
    return PayrollModel.findByIdAndUpdate(existing._id, {
      baseSalary: calc.baseSalary, accruedSalary: calc.accruedSalary,
      overtimeAmount: calc.overtimeAmount, bonusesAmount: calc.bonusesAmount,
      deductionsAmount: calc.deductionsAmount, loanDeduction: calc.loanDeduction,
      absenceDeduction: calc.absenceDeduction, finalAmount: calc.finalAmount,
      status: "finalized",
    }, { new: true });
  }

  const record = await PayrollModel.create({
    employeeId, month, year, baseSalary: calc.baseSalary,
    accruedSalary: calc.accruedSalary, overtimeAmount: calc.overtimeAmount,
    bonusesAmount: calc.bonusesAmount, deductionsAmount: calc.deductionsAmount,
    loanDeduction: calc.loanDeduction, absenceDeduction: calc.absenceDeduction,
    finalAmount: calc.finalAmount, status: "finalized", generatedAt: new Date(),
  });
  const loans = await LoanModel.find({ employeeId });
  await Promise.all(loans.map(async (loan: any) => {
    const remaining = Number(loan.remaining);
    if (remaining <= 0) return;
    const applied = Math.min(remaining, Number(loan.installment));
    await LoanModel.findByIdAndUpdate(loan._id, {
      remaining: Math.round((remaining - applied) * 100) / 100,
    });
  }));
  return record;
}

router.get("/payroll", requireAuth, async (req, res): Promise<void> => {
  const query = ListPayrollQueryParams.safeParse(req.query);
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
  if (query.data.month) filter.month = query.data.month;
  if (query.data.year) filter.year = query.data.year;

  let rows = await PayrollModel.find(filter);
  if (employeeIds) {
    rows = rows.filter((r: any) => employeeIds!.includes(r.employeeId.toString()));
  }

  // فلترة السجلات اليتيمة (موظفون محذوفون)
  const allEmployeeIds = (await EmployeeModel.find({}).select("_id")).map((e: any) => e._id.toString());
  rows = rows.filter((r: any) => allEmployeeIds.includes(r.employeeId.toString()));

  res.json(await Promise.all(rows.map(serialize)));
});

router.post("/payroll/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GeneratePayrollBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const { employeeId, month, year } = parsed.data;
  if (employeeId === "all") {
    const branchId = effectiveBranchId(req.session.user!, undefined);
    const employees = await EmployeeModel.find(branchId ? { branchId } : {}).select("_id");
    const records = await Promise.all(
      employees.map((employee: any) => generatePayrollRecord(employee._id.toString(), year, month)),
    );
    await logAudit(req.session.user, branchId ?? null, "توليد رواتب", `تم توليد كشوفات رواتب شهر ${month}/${year}`);
    res.status(201).json(await Promise.all(records.filter(Boolean).map(serialize)));
    return;
  }
  const empId = String(employeeId);
  const calc = await calculatePayroll(empId, year, month);

  const existing = await PayrollModel.findOne({ employeeId: empId, month, year });
  let record;
  if (existing) {
    record = await PayrollModel.findByIdAndUpdate(
      existing._id,
      {
        baseSalary: calc.baseSalary,
        accruedSalary: calc.accruedSalary,
        overtimeAmount: calc.overtimeAmount,
        bonusesAmount: calc.bonusesAmount,
        deductionsAmount: calc.deductionsAmount,
        loanDeduction: calc.loanDeduction,
        absenceDeduction: calc.absenceDeduction,
        finalAmount: calc.finalAmount,
        status: "finalized",
      },
      { new: true },
    );
  } else {
    record = await PayrollModel.create({
      employeeId: empId,
      month,
      year,
      baseSalary: calc.baseSalary,
      accruedSalary: calc.accruedSalary,
      overtimeAmount: calc.overtimeAmount,
      bonusesAmount: calc.bonusesAmount,
      deductionsAmount: calc.deductionsAmount,
      loanDeduction: calc.loanDeduction,
      absenceDeduction: calc.absenceDeduction,
      finalAmount: calc.finalAmount,
      status: "finalized",
      generatedAt: new Date(),
    });

    // تطبيق أقساط السلف
    const loans = await LoanModel.find({ employeeId: empId });
    for (const loan of loans) {
      const remaining = Number(loan.remaining);
      if (remaining <= 0) continue;
      const applied = Math.min(remaining, Number(loan.installment));
      await LoanModel.findByIdAndUpdate(loan._id, {
        remaining: Math.round((remaining - applied) * 100) / 100,
      });
    }
  }

  await logAudit(
    req.session.user,
    null,
    "توليد رواتب",
    `تم توليد كشف رواتب لشهر ${month}/${year}`,
  );
  res.status(201).json([await serialize(record)]);
});

router.get("/payroll/current/:employeeId", requireAuth, async (req, res): Promise<void> => {
  const params = GetCurrentPayrollParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const now = new Date();
  const empId = String(params.data.employeeId);
  const calc = await calculatePayroll(empId, now.getFullYear(), now.getMonth() + 1, now.getDate());
  const employee = await EmployeeModel.findById(empId);

  res.json({
    employeeId: empId,
    employeeName: employee?.fullName ?? "",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    daysInMonth: calc.daysInMonthCount,
    daysElapsed: calc.daysElapsed,
    accruedPercent: calc.accruedPercent,
    accruedSalary: calc.accruedSalary,
    overtimeAmount: calc.overtimeAmount,
    bonusesAmount: calc.bonusesAmount,
    deductionsAmount: calc.deductionsAmount,
    loanDeduction: calc.loanDeduction,
    absenceDeduction: calc.absenceDeduction,
    estimatedFinalAmount: calc.finalAmount,
  });
});

export default router;
