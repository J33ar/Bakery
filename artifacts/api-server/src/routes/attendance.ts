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

const STANDARD_SHIFT_START = "08:00:00";
const STANDARD_SHIFT_END = "16:00:00";

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function extractTime(value: string | null): string | null {
  if (!value) return null;
  // ISO string: "2026-07-11T08:00:00.000Z" → "08:00:00"
  if (value.includes("T")) {
    return value.split("T")[1]!.slice(0, 8);
  }
  // already "HH:mm:ss" or "HH:mm"
  return value.slice(0, 8);
}

function computeDerived(checkIn: string | null, checkOut: string | null) {
  const inTime = extractTime(checkIn);
  const outTime = extractTime(checkOut);
  if (!inTime || !outTime) {
    return { workMinutes: null, overtimeMinutes: null, lateMinutes: null, earlyLeaveMinutes: null };
  }
  const inMin = toMinutes(inTime);
  const outMin = toMinutes(outTime);
  const shiftStart = toMinutes(STANDARD_SHIFT_START);
  const shiftEnd = toMinutes(STANDARD_SHIFT_END);
  return {
    workMinutes: Math.max(0, outMin - inMin),
    lateMinutes: Math.max(0, inMin - shiftStart),
    earlyLeaveMinutes: Math.max(0, shiftEnd - outMin),
    overtimeMinutes: Math.max(0, outMin - shiftEnd),
  };
}

async function serialize(a: any) {
  const employee = await EmployeeModel.findById(a.employeeId);
  return {
    id: a._id.toString(),
    employeeId: a.employeeId.toString(),
    employeeName: employee?.fullName ?? "",
    branchId: employee?.branchId?.toString() ?? "",
    date: a.date,
    checkIn: a.checkIn ?? null,
    checkOut: a.checkOut ?? null,
    workMinutes: a.workMinutes ?? null,
    overtimeMinutes: a.overtimeMinutes ?? null,
    lateMinutes: a.lateMinutes ?? null,
    earlyLeaveMinutes: a.earlyLeaveMinutes ?? null,
    notes: a.notes ?? null,
    status: a.status,
  };
}

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
    if (query.data.to) filter.date.$lte = query.data.to;
  }

  let rows = await AttendanceModel.find(filter);
  if (employeeIds) {
    rows = rows.filter((r: any) => employeeIds!.includes(r.employeeId.toString()));
  }

  res.json(await Promise.all(rows.map(serialize)));
});

router.post("/attendance", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const derived = computeDerived(parsed.data.checkIn ?? null, parsed.data.checkOut ?? null);
  const record = await AttendanceModel.create({
    ...parsed.data,
    ...derived,
    status: parsed.data.status ?? "present",
  });

  await logAudit(req.session.user, null, "تسجيل حضور", `سجل حضور جديد للموظف ${record.employeeId}`);
  res.status(201).json(await serialize(record));
});

router.post("/attendance/check-in", requireAuth, async (req, res): Promise<void> => {
  const parsed = CheckInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const time = new Date().toTimeString().slice(0, 8);
  const date = new Date().toISOString().slice(0, 10);
  const employeeId = String(parsed.data.employeeId);

  const existing = await AttendanceModel.findOne({ employeeId, date });
  let record;
  if (existing) {
    record = await AttendanceModel.findByIdAndUpdate(
      existing._id,
      { checkIn: time, status: "present" },
      { new: true },
    );
  } else {
    const derived = computeDerived(time, null);
    record = await AttendanceModel.create({
      employeeId,
      date,
      checkIn: time,
      status: "present",
      ...derived,
    });
  }

  await logAudit(req.session.user, null, "تسجيل دخول موظف", `دخول للموظف ${employeeId}`);
  res.status(201).json(await serialize(record));
});

router.post("/attendance/check-out", requireAuth, async (req, res): Promise<void> => {
  const parsed = CheckOutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const time = new Date().toTimeString().slice(0, 8);
  const date = new Date().toISOString().slice(0, 10);
  const employeeId = String(parsed.data.employeeId);

  const existing = await AttendanceModel.findOne({ employeeId, date });
  if (!existing) {
    res.status(404).json({ error: "لا يوجد تسجيل دخول لهذا اليوم" });
    return;
  }

  const derived = computeDerived(existing.checkIn ?? null, time);
  const record = await AttendanceModel.findByIdAndUpdate(
    existing._id,
    { checkOut: time, ...derived },
    { new: true },
  );

  await logAudit(req.session.user, null, "تسجيل خروج موظف", `خروج للموظف ${employeeId}`);
  res.json(await serialize(record));
});

router.patch("/attendance/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAttendanceParams.safeParse(req.params);
  const body = UpdateAttendanceBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: formatZodError((params.error ?? body.error)!) });
    return;
  }

  const existing = await AttendanceModel.findById(params.data.id);
  if (!existing) {
    res.status(404).json({ error: "السجل غير موجود" });
    return;
  }

  // استخرج الأوقات — إذا null يعني امسحها، إذا undefined خذ القيمة الموجودة
  const newCheckIn = body.data.checkIn !== undefined ? extractTime(body.data.checkIn) : extractTime(existing.checkIn ?? null);
  const newCheckOut = body.data.checkOut !== undefined ? extractTime(body.data.checkOut) : extractTime(existing.checkOut ?? null);

  const derived = computeDerived(newCheckIn, newCheckOut);

  const updateData: any = {
    status: body.data.status ?? existing.status,
    notes: body.data.notes !== undefined ? body.data.notes : existing.notes,
    checkIn: newCheckIn,
    checkOut: newCheckOut,
    ...derived,
  };

  const record = await AttendanceModel.findByIdAndUpdate(
    params.data.id,
    updateData,
    { new: true },
  );

  await logAudit(req.session.user, null, "تعديل حضور", `تعديل سجل حضور ${params.data.id}`);
  res.json(await serialize(record));
});

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
