import { mongoose } from "../index";
import { z } from "zod";

const loanSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    installment: { type: Number, required: true },
    remaining: { type: Number, required: true },
  },
  { timestamps: false }
);

export const LoanModel =
  mongoose.models["loans"] ?? mongoose.model("loans", loanSchema);

export const insertLoanSchema = z.object({
  employeeId: z.string(),
  amount: z.number(),
  date: z.string(),
  installment: z.number(),
  remaining: z.number(),
});
export type InsertLoan = z.infer<typeof insertLoanSchema>;

export interface Loan {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
  installment: number;
  remaining: number;
}
