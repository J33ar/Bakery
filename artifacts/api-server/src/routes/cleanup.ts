import { Router, type IRouter } from "express";
import {
  EmployeeModel,
  AttendanceModel,
  LeaveModel,
  BonusModel,
  DeductionModel,
  LoanModel,
  PayrollModel,
  WarehouseItemModel,
  WarehouseMovementModel,
  AuditLogModel,
  OvertimeRateModel,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// route مؤقت للتنظيف الشامل — يُحذف بعد الاستخدام
router.post("/admin/cleanup", requireAuth, async (req, res): Promise<void> => {
  await Promise.all([
    EmployeeModel.deleteMany({}),
    AttendanceModel.deleteMany({}),
    LeaveModel.deleteMany({}),
    BonusModel.deleteMany({}),
    DeductionModel.deleteMany({}),
    LoanModel.deleteMany({}),
    PayrollModel.deleteMany({}),
    WarehouseItemModel.deleteMany({}),
    WarehouseMovementModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    OvertimeRateModel.deleteMany({}),
  ]);

  res.json({ success: true, message: "تم حذف جميع البيانات ما عدا المستخدمين والفروع" });
});

export default router;
