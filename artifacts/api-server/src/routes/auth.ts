import { Router, type IRouter } from "express";
import { UserModel, BranchModel } from "@workspace/db";
import { LoginBody, ListAuthBranchesResponse, GetCurrentUserResponse } from "@workspace/api-zod";
import { comparePassword, requireAuth, signToken, verifyToken, type SessionUser } from "../lib/auth";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

function docToSessionUser(doc: any): SessionUser {
  return {
    id: doc._id.toString(),
    username: doc.username,
    fullName: doc.fullName,
    role: doc.role,
    branchId: doc.branchId ? doc.branchId.toString() : null,
  };
}

async function withBranchName(user: SessionUser) {
  let branchName: string | null = null;
  if (user.branchId) {
    const branch = await BranchModel.findById(user.branchId);
    branchName = branch?.name ?? null;
  }
  return { ...user, branchName, active: true, createdAt: new Date().toISOString() };
}

router.get("/auth/branches", async (_req, res): Promise<void> => {
  const branches = await BranchModel.find();
  const result = branches.map((b: any) => ({ id: b._id.toString(), name: b.name }));
  res.json(ListAuthBranchesResponse.parse(result));
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { branchId, username, password } = parsed.data;

  const candidate = await UserModel.findOne({ username, active: true });
  if (!candidate) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  if (candidate.role === "branch_manager") {
    const candidateBranchId = candidate.branchId?.toString();
    if (!branchId || candidateBranchId !== String(branchId)) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }
  }

  const valid = await comparePassword(password, candidate.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
    return;
  }

  const sessionUser = docToSessionUser(candidate);
  req.session.user = sessionUser;
  await logAudit(sessionUser, sessionUser.branchId, "تسجيل دخول", `${candidate.fullName} سجل الدخول`);

  const token = signToken(sessionUser);
  const userData = await withBranchName(sessionUser);
  res.json({ ...GetCurrentUserResponse.parse(userData), token });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  const user = req.session.user;
  req.session.destroy(() => {
    if (user) {
      void logAudit(user, user.branchId, "تسجيل خروج", `${user.fullName} سجل الخروج`);
    }
    res.status(204).send();
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const { password } = req.body;
  if (!password || password.length < 4) {
    res.status(400).json({ error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
    return;
  }

  // نحصل على الـ user ID من الـ JWT أو الـ session
  const userId = req.session.user?.id;
  if (!userId) {
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }

  const { hashPassword } = await import("../lib/auth");
  const passwordHash = await hashPassword(password);

  const user = await UserModel.findByIdAndUpdate(
    userId,
    { passwordHash },
    { new: true }
  );

  if (!user) {
    res.status(404).json({ error: "المستخدم غير موجود" });
    return;
  }

  await logAudit(req.session.user, user.branchId?.toString() ?? null, "تغيير كلمة المرور", `${user.fullName} غيّر كلمة المرور`);
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  // قبول JWT من Authorization header (cross-origin production)
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    if (!user) {
      res.status(401).json({ error: "غير مصرح بالدخول" });
      return;
    }
    res.json(GetCurrentUserResponse.parse(await withBranchName(user)));
    return;
  }

  // session cookie fallback للتطوير المحلي
  if (!req.session.user) {
    res.status(401).json({ error: "غير مصرح بالدخول" });
    return;
  }
  res.json(GetCurrentUserResponse.parse(await withBranchName(req.session.user)));
});

export default router;
