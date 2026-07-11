import { mongoose } from "../index";
import { z } from "zod";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, required: true }, // general_manager | branch_manager
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "branches", default: null },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const UserModel =
  mongoose.models["users"] ?? mongoose.model("users", userSchema);

export const insertUserSchema = z.object({
  username: z.string(),
  passwordHash: z.string(),
  fullName: z.string(),
  role: z.string(),
  branchId: z.string().nullable().optional(),
  active: z.boolean().optional(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: string;
  branchId: string | null;
  active: boolean;
  createdAt: Date;
}
