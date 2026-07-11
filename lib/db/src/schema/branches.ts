import { mongoose } from "../index";
import { z } from "zod";

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
  },
  { timestamps: false }
);

export const BranchModel =
  mongoose.models["branches"] ??
  mongoose.model("branches", branchSchema);

// Zod types
export const insertBranchSchema = z.object({
  name: z.string(),
});
export type InsertBranch = z.infer<typeof insertBranchSchema>;

export interface Branch {
  id: number | string;
  name: string;
}
