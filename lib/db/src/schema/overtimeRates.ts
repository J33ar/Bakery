import { mongoose } from "../index";
import { z } from "zod";

const overtimeRateSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "branches", required: true },
    ratePerHour: { type: Number, required: true },
    effectiveFrom: { type: String, required: true }, // YYYY-MM-DD
    effectiveTo: { type: String, default: null },     // YYYY-MM-DD | null = لا يزال سارياً
  },
  { timestamps: false }
);

export const OvertimeRateModel =
  mongoose.models["overtime_rates"] ?? mongoose.model("overtime_rates", overtimeRateSchema);

export const insertOvertimeRateSchema = z.object({
  branchId: z.string(),
  ratePerHour: z.number(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable().optional(),
});
export type InsertOvertimeRate = z.infer<typeof insertOvertimeRateSchema>;

export interface OvertimeRate {
  id: string;
  branchId: string;
  ratePerHour: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}
