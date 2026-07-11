import { mongoose } from "../index";
import { z } from "zod";

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    checkIn: { type: String, default: null },
    checkOut: { type: String, default: null },
    workMinutes: { type: Number, default: null },
    overtimeMinutes: { type: Number, default: null },
    lateMinutes: { type: Number, default: null },
    earlyLeaveMinutes: { type: Number, default: null },
    notes: { type: String, default: null },
    status: { type: String, required: true, default: "present" }, // present | absent | leave | late
  },
  { timestamps: false }
);

export const AttendanceModel =
  mongoose.models["attendance"] ?? mongoose.model("attendance", attendanceSchema);

export const insertAttendanceSchema = z.object({
  employeeId: z.string(),
  date: z.string(),
  checkIn: z.string().nullable().optional(),
  checkOut: z.string().nullable().optional(),
  workMinutes: z.number().nullable().optional(),
  overtimeMinutes: z.number().nullable().optional(),
  lateMinutes: z.number().nullable().optional(),
  earlyLeaveMinutes: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.string().optional(),
});
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;

export interface Attendance {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workMinutes: number | null;
  overtimeMinutes: number | null;
  lateMinutes: number | null;
  earlyLeaveMinutes: number | null;
  notes: string | null;
  status: string;
}
