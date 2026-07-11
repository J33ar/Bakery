import { mongoose } from "../index";
import { z } from "zod";

const payrollSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    baseSalary: { type: Number, required: true },
    accruedSalary: { type: Number, required: true },
    overtimeAmount: { type: Number, required: true },
    bonusesAmount: { type: Number, required: true },
    deductionsAmount: { type: Number, required: true },
    loanDeduction: { type: Number, required: true },
    absenceDeduction: { type: Number, required: true },
    finalAmount: { type: Number, required: true },
    status: { type: String, required: true, default: "finalized" }, // draft | finalized
    generatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

export const PayrollModel =
  mongoose.models["payroll"] ?? mongoose.model("payroll", payrollSchema);

export const insertPayrollSchema = z.object({
  employeeId: z.string(),
  month: z.number(),
  year: z.number(),
  baseSalary: z.number(),
  accruedSalary: z.number(),
  overtimeAmount: z.number(),
  bonusesAmount: z.number(),
  deductionsAmount: z.number(),
  loanDeduction: z.number(),
  absenceDeduction: z.number(),
  finalAmount: z.number(),
  status: z.string().optional(),
});
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;

export interface Payroll {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  accruedSalary: number;
  overtimeAmount: number;
  bonusesAmount: number;
  deductionsAmount: number;
  loanDeduction: number;
  absenceDeduction: number;
  finalAmount: number;
  status: string;
  generatedAt: Date;
}
