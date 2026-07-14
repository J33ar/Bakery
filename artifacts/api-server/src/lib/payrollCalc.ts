import {
  AttendanceModel,
  BonusModel,
  DeductionModel,
  LoanModel,
  OvertimeRateModel,
  EmployeeModel,
} from "@workspace/db";

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Finds the overtime rate applicable on a given date for a branch */
async function getOvertimeRateOn(
  branchId: string,
  onDate: string,
): Promise<number> {
  const rates = await OvertimeRateModel.find({
    branchId,
    effectiveFrom: { $lte: onDate },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $exists: false } },
      { effectiveTo: { $gte: onDate } },
    ],
  }).sort({ effectiveFrom: -1 });

  if (rates.length === 0) return 0;
  return Number(rates[0]!.ratePerHour);
}

export interface PayrollCalcResult {
  baseSalary: number;
  daysInMonthCount: number;
  daysElapsed: number;
  accruedSalary: number;
  accruedPercent: number;
  overtimeAmount: number;
  bonusesAmount: number;
  deductionsAmount: number;
  loanDeduction: number;
  absenceDeduction: number;
  finalAmount: number;
}

export async function calculatePayroll(
  employeeId: string,
  year: number,
  month: number,
  upToDay?: number,
): Promise<PayrollCalcResult> {
  const employee = await EmployeeModel.findById(employeeId);
  if (!employee) throw new Error("Employee not found");

  const baseSalary = Number(employee.baseSalary);
  const totalDays = daysInMonth(year, month);
  const daysElapsed = upToDay ? Math.min(upToDay, totalDays) : totalDays;
  const dailyRate = baseSalary / totalDays;
  const accruedSalary = Math.round(dailyRate * daysElapsed * 100) / 100;
  const accruedPercent = Math.round((daysElapsed / totalDays) * 10000) / 100;

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndDay = upToDay ?? totalDays;
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(monthEndDay).padStart(2, "0")}`;

  const attendanceRecords = await AttendanceModel.find({
    employeeId,
    date: { $gte: monthStart, $lte: monthEnd },
  });

  let overtimeAmount = 0;
  let absentDays = 0;
  for (const record of attendanceRecords) {
    if (record.status === "absent") absentDays += 1;
    if (record.overtimeMinutes && record.overtimeMinutes > 0) {
      const rate = await getOvertimeRateOn(
        employee.branchId.toString(),
        record.date,
      );
      overtimeAmount += (record.overtimeMinutes / 60) * rate;
    }
  }
  overtimeAmount = Math.round(overtimeAmount * 100) / 100;
  const absenceDeduction = Math.round(dailyRate * absentDays * 100) / 100;

  const bonuses = await BonusModel.find({
    employeeId,
    date: { $gte: monthStart, $lte: monthEnd },
  });
  const bonusesAmount =
    Math.round(bonuses.reduce((sum, b) => sum + Number(b.amount), 0) * 100) /
    100;

  const deductions = await DeductionModel.find({
    employeeId,
    date: { $gte: monthStart, $lte: monthEnd },
  });
  const deductionsAmount =
    Math.round(
      deductions.reduce((sum, d) => sum + Number(d.amount), 0) * 100,
    ) / 100;

  const loans = await LoanModel.find({ employeeId });
  let loanDeduction = 0;
  for (const loan of loans) {
    const remaining = Number(loan.remaining);
    const installment = Number(loan.installment);
    if (remaining > 0) loanDeduction += Math.min(installment, remaining);
  }
  loanDeduction = Math.round(loanDeduction * 100) / 100;

  const finalAmount =
    Math.round(
      (accruedSalary +
        overtimeAmount +
        bonusesAmount -
        deductionsAmount -
        loanDeduction -
        absenceDeduction) *
        100,
    ) / 100;

  return {
    baseSalary,
    daysInMonthCount: totalDays,
    daysElapsed,
    accruedSalary,
    accruedPercent,
    overtimeAmount,
    bonusesAmount,
    deductionsAmount,
    loanDeduction,
    absenceDeduction,
    finalAmount,
  };
}
