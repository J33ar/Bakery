import { Router, type IRouter } from "express";
import { AttendanceModel, EmployeeModel } from "@workspace/db";
import {
  ListAttendanceQueryParams,
  CreateAttendanceBody,
  CheckInBody,
  CheckOutBody,
  UpdateAttendanceParams,
  UpdateAttendanceBody,
  DeleteAttendanceParams,
} from "@workspace/api-zod";
import { effectiveBranchId, requireAuth } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { formatZodError } from "../lib/zodError";

const router: IRouter = Router();

// 9 ساعات = 540 دقيقة — أي شيء زيادة = إضافي
const SHIFT_MINUTES = 9 * 60;

/**
 * يحوّل أي صيغة وقت إلى milliseconds قابل للمقارنة
 * يقبل: ISO كامل، أو "HH:mm:ss"، أو "HH:mm"
 * لضمان دقة الحساب نستخدم Date object
 */
function toMs(value: string): number {
  if (value.includes("T")) {
    // ISO string — نستخدم Date مباشرة
    return new Date(value).getTime();
  }
  // "HH:mm:ss" أو "HH:mm" — نبني Date بتاريخ ثابت
  const [h, m, s] = value.split(":").map(Number);
  const d = new Date(2000, 0, 1, h ?? 0, m ?? 0, s ?? 0);
  return d.getTime();
}

/**
 * يحسب ساعات العمل والإضافي والغياب الجزئي
 * - workMinutes     = الفرق الفعلي بين الدخول والخروج
 * - overtimeMinutes = workMinutes > 540 ? الزيادة : 0
 * - lateMinutes     = workMinutes < 540 ? النقص : 0
 */
function computeDerived(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) {
    return { workMinutes: null, overtimeMinutes: null, lateMinutes: null, earlyLeaveMinutes: null };
  }

  let diffMs = toMs(checkOut) - toMs(checkIn);

  // دعم الدوام الليلي — إذا الخروج قبل الدخول نضيف 24 ساعة
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

  const workMinutes     = Math.round(diffMs / 60000);
  const overtimeMinutes = Math.max(0, workMinutes - SHIFT_MINUTES);
  const absenceMinutes  = Math.max(0, SHIFT_MINUTES - workMinutes);

  return {
    workMinutes,
    overtimeMinutes,
    lateMinutes: absenceMinutes,
    earlyLeaveMinutes: 0,
  };
}

// ── serialize ─────────────────────────────────────────────────────────────────

async function serialize(a: any) {
  const employee = await EmployeeModel.findById(a.employeeId);
  return {
    id: a._id.toString(),
    employeeId: a.employeeId.toString(),
    employeeName: employee?.fullName ?? "",
    branchId: employee?.branchId?.toString() ?? "",
    date: a.date,
    checkIn:  a.checkIn  ?? null,
    checkOut: a.checkOut ?? null,
    workMinutes:       a.workMinutes       ?? null,
    overtimeMinutes:   a.overtimeMinutes   ?? null,
    lateMinutes:       a.lateMinutes       ?? null,
    earlyLeaveMinutes: a.earlyLeaveMinutes ?? null,
    notes:  a.notes  ?? null,
    status: a.status,
  };
}

// ── GET list ──────────────────────────────────────────────────────────────────

router.get("/attendance", requireAuth, async (req, res): Promise<void> => {
  const query = ListAttendanceQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: formatZodError(query.error) });
    return;
  }
  const branchId = effectiveBranchId(req.session.user!, query.data.branchId as any);

  let employeeIds: string[] | undefined;
  if (branchId) {
    const employees = await EmployeeModel.find({ branchId: String(branchId) });
    employeeIds = employees.map((e: any) => e._id.toString());
  }

  const filter: any = {};
  if (query.data.employeeId) filter.employeeId = String(query.data.employeeId);
  if (query.data.date) filter.date = query.data.date;
  if (query.data.from || query.data.to) {
    filter.date = {};
    if (query.data.from) filter.date.$gte = query.data.from;
    if (query.data.to)   filter.date.$lte = query.data.to;
  }

  let rows = await AttendanceModel.find(filter);
  if (employeeIds) {
    rows = rows.filter((r: any) => employeeIds!.includes(r.employeeId.toString()));
  }

  // حذف السجلات اليتيمة
  const allIds = (await EmployeeModel.find({}).select("_id")).map((e: any) => e._id.toString());
  rows = rows.filter((r: any) => allIds.includes(r.employeeId.toString()));

  res.json(await Promise.all(rows.map(serialize)));
});

// ── POST manual ───────────────────────────────────────────────────────────────

router.post("/attendance", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const derived = computeDerived(parsed.data.checkIn ?? null, parsed.data.checkOut ?? null);
  const record  = await AttendanceModel.create({
    ...parsed.data,
    ...derived,
    status: parsed.data.status ?? "present",
  });
  await logAudit(req.session.user, null, "تسجيل حضور", `سجل حضور جديد للموظف ${record.employeeId}`);
  res.status(201).json(await serialize(record));
});

// ── POST check-in ─────────────────────────────────────────────────────────────

router.post("/attendance/check-in", requireAuth, async (req, res): Promise<void> => {
  const parsed = CheckInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  const now        = new Date();
  const timeStr    = now.toTimeString().slice(0, 8);   // "HH:mm:ss" بتوقيت السيرفر
  const dateStr    = now.toISOString().slice(0, 10);   // "YYYY-MM-DD"
  const employeeId = String(parsed.data.employeeId);

  const existing = await AttendanceModel.findOne({ employeeId, date: dateStr });
  let record;
  if (existing) {
    record = await AttendanceModel.findByIdAndUpdate(
      existing._id,
      { checkIn: timeStr, status: "present" },
      { new: true },
    );
  } else {
    record = await AttendanceModel.create({
      employeeId,
      date: dateStr,
      checkIn: timeStr,
      status: "present",
      workMinutes: null,
      overtimeMinutes: null,
      lateMinutes: null,
      earlyLeaveMinutes: null,
    });
  }

  await logAudit(req.session.user, null, "تسجيل دخول موظف", `دخول للموظف ${employeeId}`);
  res.status(201).json(await serialize(record));
});

// ── POST check-out ────────────────────────────────────────────────────────────

router.post("/attendance/check-out", requireAuth, async (req, res): Promise<void> => {
  const parsed = CheckOutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  const now        = new Date();
  const timeStr    = now.toTimeString().slice(0, 8);
  const dateStr    = now.toISOString().slice(0, 10);
  const employeeId = String(parsed.data.employeeId);

  const existing = await AttendanceModel.findOne({ employeeId, date: dateStr });
  if (!existing) {
    res.status(404).json({ error: "لا يوجد تسجيل دخول لهذا اليوم" });
    return;
  }

  const derived = computeDerived(existing.checkIn ?? null, timeStr);
  const record  = await AttendanceModel.findByIdAndUpdate(
    existing._id,
    { checkOut: timeStr, ...derived },
    { new: true },
  );

  await logAudit(req.session.user, null, "تسجيل خروج موظف", `خروج للموظف ${employeeId}`);
  res.json(await serialize(record));
});

// ── PATCH ─────────────────────────────────────────────────────────────────────

router.patch("/attendance/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAttendanceParams.safeParse(req.params);
  const body   = UpdateAttendanceBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: formatZodError((params.error ?? body.error)!) });
    return;
  }

  const existing = await AttendanceModel.findById(params.data.id);
  if (!existing) {
    res.status(404).json({ error: "السجل غير موجود" });
    return;
  }

  const newCheckIn  = body.data.checkIn  !== undefined ? body.data.checkIn  : (existing.checkIn  ?? null);
  const newCheckOut = body.data.checkOut !== undefined ? body.data.checkOut : (existing.checkOut ?? null);
  const derived     = computeDerived(newCheckIn, newCheckOut);

  const record = await AttendanceModel.findByIdAndUpdate(
    params.data.id,
    {
      status:   body.data.status ?? existing.status,
      notes:    body.data.notes !== undefined ? body.data.notes : existing.notes,
      checkIn:  newCheckIn,
      checkOut: newCheckOut,
      ...derived,
    },
    { new: true },
  );

  await logAudit(req.session.user, null, "تعديل حضور", `تعديل سجل حضور ${params.data.id}`);
  res.json(await serialize(record));
});

// ── إعادة حساب جميع السجلات (مؤقت) ─────────────────────────────────────────

router.post("/attendance/recalculate", requireAuth, async (req, res): Promise<void> => {
  const all = await AttendanceModel.find({ checkIn: { $ne: null }, checkOut: { $ne: null } });
  let updated = 0;
  for (const r of all) {
    const derived = computeDerived(r.checkIn ?? null, r.checkOut ?? null);
    await AttendanceModel.findByIdAndUpdate(r._id, derived);
    updated++;
  }
  res.json({ success: true, updated });
});

// ── DELETE ────────────────────────────────────────────────────────────────────

router.delete("/attendance/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAttendanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: formatZodError(params.error) });
    return;
  }
  const record = await AttendanceModel.findByIdAndDelete(params.data.id);
  if (!record) {
    res.status(404).json({ error: "السجل غير موجود" });
    return;
  }
  await logAudit(req.session.user, null, "حذف حضور", `حذف سجل حضور ${params.data.id}`);
  res.status(204).send();
});

export default router;
