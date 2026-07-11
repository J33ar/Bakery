import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import branchesRouter from "./branches";
import usersRouter from "./users";
import employeesRouter from "./employees";
import attendanceRouter from "./attendance";
import leavesRouter from "./leaves";
import overtimeRouter from "./overtime";
import bonusesRouter from "./bonuses";
import deductionsRouter from "./deductions";
import loansRouter from "./loans";
import payrollRouter from "./payroll";
import warehouseRouter from "./warehouse";
import auditRouter from "./audit";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(branchesRouter);
router.use(usersRouter);
router.use(employeesRouter);
router.use(attendanceRouter);
router.use(leavesRouter);
router.use(overtimeRouter);
router.use(bonusesRouter);
router.use(deductionsRouter);
router.use(loansRouter);
router.use(payrollRouter);
router.use(warehouseRouter);
router.use(auditRouter);
router.use(dashboardRouter);

export default router;
