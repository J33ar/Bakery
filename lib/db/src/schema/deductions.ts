import { mongoose } from "../index";
import { z } from "zod";

const deductionSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    date: { type: String, required: true },
  },
  { timestamps: false }
);

export const DeductionModel =
  mongoose.models["deductions"] ?? mongoose.model("deductions", deductionSchema);

export const insertDeductionSchema = z.object({
  employeeId: z.string(),
  amount: z.number(),
  reason: z.string(),
  date: z.string(),
});
export type InsertDeduction = z.infer<typeof insertDeductionSchema>;

export interface Deduction {
  id: string;
  employeeId: string;
  amount: number;
  reason: string;
  date: string;
}
