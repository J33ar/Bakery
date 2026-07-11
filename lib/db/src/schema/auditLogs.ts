import { mongoose } from "../index";
import { z } from "zod";

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "branches", default: null },
    action: { type: String, required: true },
    details: { type: String, default: null },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false }
);

export const AuditLogModel =
  mongoose.models["audit_logs"] ?? mongoose.model("audit_logs", auditLogSchema);

export const insertAuditLogSchema = z.object({
  userId: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
  action: z.string(),
  details: z.string().nullable().optional(),
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export interface AuditLog {
  id: string;
  userId: string | null;
  branchId: string | null;
  action: string;
  details: string | null;
  date: Date;
}
