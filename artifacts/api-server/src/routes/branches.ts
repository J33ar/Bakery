import { Router, type IRouter } from "express";
import { BranchModel } from "@workspace/db";
import { ListBranchesResponse } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/branches", requireAuth, async (_req, res): Promise<void> => {
  const branches = await BranchModel.find();
  const result = branches.map((b: any) => ({ id: b._id.toString(), name: b.name }));
  res.json(ListBranchesResponse.parse(result));
});

export default router;
