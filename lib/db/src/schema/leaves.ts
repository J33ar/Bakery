import { mongoose } from "../index";
import { z } from "zod";

const leaveSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
    type: { type: String, required: true }, // annual | sick | emergency | unpaid
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    days: { type: Number, required: true },
    paid: { type: Boolean, required: true, default: true },
    status: { type: String, required: true, default: "pending" }, // pending | approved | rejected
    reason: { type: String, default: null },
  },
  { timestamps: false }
);

export const LeaveModel =
  mongoose.models["leaves"] ?? mongoose.model("leaves", leaveSchema);

export const insertLeaveSchema = z.object({
  employeeId: z.string(),
  type: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  days: z.number(),
  paid: z.boolean().optional(),
  status: z.string().optional(),
  reason: z.string().nullable().optional(),
});
export type InsertLeave = z.infer<typeof insertLeaveSchema>;

export interface Leave {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  paid: boolean;
  status: string;
  reason: string | null;
}
