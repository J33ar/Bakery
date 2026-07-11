import { Router, type IRouter } from "express";
import {
  EmployeeModel,
  AttendanceModel,
  LeaveModel,
  WarehouseItemModel,
  AuditLogModel,
  UserModel,
  BranchModel,
  PayrollModel,
  AttendanceModel as Attendance,
} from "@workspace/db";
import { GetDashboardSummaryQueryParams } from "@workspace/api-zod";
import { effectiveBranchId, requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const query = GetDashboardSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const branchId = effectiveBranchId(req.session.user!, query.data.branchId as any);

  const empFilter: any = {};
  if (branchId) empFilter.branchId = String(branchId);

  const employees = await EmployeeModel.find(empFilter);
  const activeEmployees = employees.filter((e: any) => e.status === "active");
  const employeeIds = employees.map((e: any) => e._id.toString());

  const today = new Date().toISOString().slice(0, 10);

  // حضور اليوم
  const todayAttendance = await AttendanceModel.find({ date: today });
  const todayEmpAttendance = todayAttendance.filter((a: any) =>
    employeeIds.includes(a.employeeId.toString()),
  );
  const presentToday = todayEmpAttendance.filter((a: any) => a.status === "present").length;
  const absentToday = todayEmpAttendance.filter((a: any) => a.status === "absent").length;

  // إجازات اليوم
  const activeLeaves = await LeaveModel.find({ status: "approved" });
  const onLeaveToday = activeLeaves.filter(
    (l: any) =>
      employeeIds.includes(l.employeeId.toString()) &&
      l.startDate <= today &&
      l.endDate >= today,
  ).length;

  // إجازات معلقة
  const pendingLeaves = await LeaveModel.find({ status: "pending" });
  const pendingLeavesCount = pendingLeaves.filter((l: any) =>
    employeeIds.includes(l.employeeId.toString()),
  ).length;

  // الرواتب المتراكمة للشهر الحالي
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const payrolls = await PayrollModel.find({ month: currentMonth, year: currentYear });
  const currentPayrollTotal = payrolls
    .filter((p: any) => employeeIds.includes(p.employeeId.toString()))
    .reduce((sum: number, p: any) => sum + Number(p.finalAmount), 0);
  const currentOvertimeTotal = payrolls
    .filter((p: any) => employeeIds.includes(p.employeeId.toString()))
    .reduce((sum: number, p: any) => sum + Number(p.overtimeAmount), 0);

  // المستودع
  const itemFilter: any = {};
  if (branchId) itemFilter.branchId = String(branchId);
  const items = await WarehouseItemModel.find(itemFilter);
  const lowStockItemsRaw = items.filter(
    (i: any) => Number(i.quantity) <= Number(i.minQuantity),
  );

  // إضافة branchName لكل صنف
  const lowStockItems = await Promise.all(
    lowStockItemsRaw.map(async (i: any) => {
      const branch = await BranchModel.findById(i.branchId);
      return {
        id: i._id.toString(),
        name: i.name,
        code: i.code,
        quantity: Number(i.quantity),
        minQuantity: Number(i.minQuantity),
        unit: i.unit,
        branchName: branch?.name ?? "",
      };
    }),
  );

  // آخر العمليات
  const logFilter: any = {};
  if (branchId) logFilter.branchId = String(branchId);
  const recentLogsRaw = await AuditLogModel.find(logFilter)
    .sort({ date: -1 })
    .limit(10);

  const recentActivity = await Promise.all(
    recentLogsRaw.map(async (log: any) => {
      let userName: string | null = null;
      let branchName: string | null = null;
      if (log.userId) {
        const user = await UserModel.findById(log.userId);
        userName = user?.fullName ?? null;
      }
      if (log.branchId) {
        const branch = await BranchModel.findById(log.branchId);
        branchName = branch?.name ?? null;
      }
      return {
        id: log._id.toString(),
        action: log.action,
        details: log.details ?? null,
        userName,
        branchName,
        date: log.date instanceof Date ? log.date.toISOString() : new Date().toISOString(),
      };
    }),
  );

  res.json({
    totalEmployees: employees.length,
    activeEmployees: activeEmployees.length,
    presentToday,
    absentToday,
    onLeaveToday,
    pendingLeaves: pendingLeavesCount,
    currentPayrollTotal,
    currentOvertimeTotal,
    warehouseItemsCount: items.length,
    lowStockItemsCount: lowStockItems.length,
    lowStockItems,
    recentActivity,
  });
});

export default router;
