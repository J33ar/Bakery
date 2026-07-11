import { mongoose } from "../index";
import { z } from "zod";

const bonusSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    date: { type: String, required: true },
  },
  { timestamps: false }
);

export const BonusModel =
  mongoose.models["bonuses"] ?? mongoose.model("bonuses", bonusSchema);

export const insertBonusSchema = z.object({
  employeeId: z.string(),
  amount: z.number(),
  reason: z.string(),
  date: z.string(),
});
export type InsertBonus = z.infer<typeof insertBonusSchema>;

export interface Bonus {
  id: string;
  employeeId: string;
  amount: number;
  reason: string;
  date: string;
}
