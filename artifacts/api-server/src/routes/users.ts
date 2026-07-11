import { Router, type IRouter } from "express";
import { UserModel, BranchModel } from "@workspace/db";
import {
  ListUsersQueryParams,
  CreateUserBody,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
} from "@workspace/api-zod";
import { requireAuth, hashPassword } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { formatZodError } from "../lib/zodError";

const router: IRouter = Router();

async function serialize(user: any) {
  let branchName: string | null = null;
  if (user.branchId) {
    const branch = await BranchModel.findById(user.branchId);
    branchName = branch?.name ?? null;
  }
  return {
    id: user._id.toString(),
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    branchId: user.branchId?.toString() ?? null,
    branchName,
    active: user.active,
    createdAt: user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : new Date().toISOString(),
  };
}

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const query = ListUsersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: formatZodError(query.error) });
    return;
  }
  const filter: any = {};
  if (query.data.branchId) filter.branchId = String(query.data.branchId);

  const rows = await UserModel.find(filter);
  res.json(await Promise.all(rows.map(serialize)));
});

router.post("/users", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const user = await UserModel.create({
    username: parsed.data.username,
    passwordHash,
    fullName: parsed.data.fullName,
    role: parsed.data.role,
    branchId: parsed.data.branchId ? String(parsed.data.branchId) : null,
    active: parsed.data.active ?? true,
  });
  await logAudit(req.session.user, user.branchId?.toString() ?? null, "إضافة مستخدم", `تمت إضافة المستخدم ${user.fullName}`);
  res.status(201).json(await serialize(user));
});

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  const body = UpdateUserBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: formatZodError((params.error ?? body.error)!) });
    return;
  }

  const updates: any = {};
  if (body.data.username !== undefined) updates.username = body.data.username;
  if (body.data.fullName !== undefined) updates.fullName = body.data.fullName;
  if (body.data.role !== undefined) updates.role = body.data.role;
  if (body.data.branchId !== undefined) {
    updates.branchId = body.data.branchId ? String(body.data.branchId) : null;
  }
  if (body.data.active !== undefined) updates.active = body.data.active;
  if (body.data.password) updates.passwordHash = await hashPassword(body.data.password);

  const user = await UserModel.findByIdAndUpdate(params.data.id, updates, { new: true });
  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }
  await logAudit(req.session.user, user.branchId?.toString() ?? null, "تعديل مستخدم", `تم تعديل المستخدم ${user.fullName}`);
  res.json(await serialize(user));
});

router.delete("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const user = await UserModel.findByIdAndDelete(params.data.id);
  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }
  await logAudit(req.session.user, user.branchId?.toString() ?? null, "حذف مستخدم", `تم حذف المستخدم ${user.fullName}`);
  res.status(204).send();
});

export default router;
