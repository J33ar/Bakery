import React from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListPayroll, 
  useGeneratePayroll,
  useGetCurrentUser, 
  UserRole,
  PayrollStatus,
  useListBranches
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { Wallet, FileSpreadsheet, PlayCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";

const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const PRIMARY   = "C2410C";
const HEADER_BG = "EA580C";
const TOTAL_BG  = "7C2D12";
const EVEN_BG   = "FFF7ED";
const WHITE     = "FFFFFF";
const GREEN     = "15803D";
const AMBER     = "B45309";
const NUM_FMT   = '#,##0.00';

const borderThin: Partial<ExcelJS.Borders> = {
  top:    { style: "thin", color: { argb: "FFDDDDDD" } },
  bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
  left:   { style: "thin", color: { argb: "FFDDDDDD" } },
  right:  { style: "thin", color: { argb: "FFDDDDDD" } },
};
const borderWhite: Partial<ExcelJS.Borders> = {
  top:    { style: "thin", color: { argb: `FF${WHITE}` } },
  bottom: { style: "thin", color: { argb: `FF${WHITE}` } },
  left:   { style: "thin", color: { argb: `FF${WHITE}` } },
  right:  { style: "thin", color: { argb: `FF${WHITE}` } },
};

function downloadBlob(buffer: ExcelJS.Buffer, filename: string) {
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Payroll() {
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;

  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();

  const [month, setMonth] = React.useState<number>(currentMonth);
  const [year,  setYear]  = React.useState<number>(currentYear);
  const [isExporting, setIsExporting] = React.useState(false);

  const { data: payroll, isLoading, isError, refetch } = useListPayroll(
    { branchId, month, year },
    { query: { enabled: !!user, queryKey: ['payroll', branchId, month, year] } }
  );

  // نحمّل قائمة الفروع لنستخدمها في تحديد اسم الفرع
  const { data: branches } = useListBranches({
    query: { enabled: !!user, queryKey: ['branches'] }
  });

  const getBranchName = (bid: string | null | undefined) =>
    branches?.find(b => b.id === bid)?.name ?? "-";

  const generateMutation = useGeneratePayroll({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم إنشاء الكشوفات", description: "تم توليد كشوفات الرواتب بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['payroll'] });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل توليد الكشوفات" });
      }
    }
  });

  const handleGenerateAll = () => {
    generateMutation.mutate({ data: { employeeId: "all", month, year } });
  };

  // ── تصدير كل الموظفين ──────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (!payroll || payroll.length === 0) return;
    setIsExporting(true);
    try {
      const monthLabel = MONTH_NAMES[month - 1] ?? month.toString();
      const wb = new ExcelJS.Workbook();
      wb.creator = "نظام المخبز";
      wb.created = new Date();
      const ws = wb.addWorksheet(`رواتب ${monthLabel} ${year}`, {
        views: [{ rightToLeft: true }],
        properties: { defaultRowHeight: 20 },
      });
      ws.columns = [
        { width: 6  }, { width: 28 }, { width: 16 }, { width: 16 },
        { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
        { width: 16 }, { width: 16 }, { width: 12 },
      ];

      const titleRow = ws.addRow([`كشف رواتب شهر ${monthLabel} ${year}`]);
      titleRow.height = 40;
      ws.mergeCells(1, 1, 1, 11);
      const tc = titleRow.getCell(1);
      tc.font      = { bold: true, size: 18, color: { argb: `FF${WHITE}` }, name: "Cairo" };
      tc.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
      tc.alignment = { horizontal: "center", vertical: "middle" };
      tc.border    = borderWhite;

      ws.addRow([]).height = 6;
      const infoRow = ws.addRow([`تاريخ الإصدار: ${new Date().toLocaleDateString("ar-JO")}   |   عدد الموظفين: ${payroll.length}`]);
      ws.mergeCells(3, 1, 3, 11);
      infoRow.height = 18;
      const ic = infoRow.getCell(1);
      ic.font      = { italic: true, size: 10, color: { argb: `FF${PRIMARY}` }, name: "Cairo" };
      ic.alignment = { horizontal: "center", vertical: "middle" };
      ws.addRow([]).height = 4;

      const headerRow = ws.addRow(["م","اسم الموظف","الفرع","الراتب الأساسي","إضافي","مكافآت","خصم غياب","أقساط سلف","خصومات أخرى","صافي الراتب","الحالة"]);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font      = { bold: true, size: 12, color: { argb: `FF${WHITE}` }, name: "Cairo" };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border    = borderWhite;
      });

      payroll.forEach((p, i) => {
        const bg  = i % 2 === 0 ? EVEN_BG : "FFFFFF";
        const row = ws.addRow([
          i + 1,
          p.employeeName || "-",
          getBranchName(p.branchId),
          Number(p.baseSalary), Number(p.overtimeAmount), Number(p.bonusesAmount),
          Number(p.absenceDeduction), Number(p.loanDeduction), Number(p.deductionsAmount),
          Number(p.finalAmount),
          p.status === PayrollStatus.finalized ? "معتمد" : "مسودة",
        ]);
        row.height = 22;
        row.eachCell((cell, col) => {
          cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg}` } };
          cell.border    = borderThin;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font      = { size: 11, name: "Cairo" };
          if (col >= 4 && col <= 10) cell.numFmt = NUM_FMT;
          if (col === 10) cell.font = { bold: true, size: 13, color: { argb: `FF${PRIMARY}` }, name: "Cairo" };
          if (col === 11) {
            const ok = cell.value === "معتمد";
            cell.font = { bold: true, size: 10, color: { argb: `FF${ok ? GREEN : AMBER}` }, name: "Cairo" };
          }
        });
      });

      const totals = [
        "", "الإجمالي الكلي", "",
        payroll.reduce((s, p) => s + Number(p.baseSalary),      0),
        payroll.reduce((s, p) => s + Number(p.overtimeAmount),   0),
        payroll.reduce((s, p) => s + Number(p.bonusesAmount),    0),
        payroll.reduce((s, p) => s + Number(p.absenceDeduction), 0),
        payroll.reduce((s, p) => s + Number(p.loanDeduction),    0),
        payroll.reduce((s, p) => s + Number(p.deductionsAmount), 0),
        payroll.reduce((s, p) => s + Number(p.finalAmount),      0),
        "",
      ];
      const totalRow = ws.addRow(totals);
      totalRow.height = 26;
      totalRow.eachCell((cell, col) => {
        cell.font      = { bold: true, size: 13, color: { argb: `FF${WHITE}` }, name: "Cairo" };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${TOTAL_BG}` } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border    = { top: { style: "medium", color: { argb: `FF${WHITE}` } }, bottom: { style: "medium", color: { argb: `FF${WHITE}` } }, left: { style: "thin", color: { argb: `FF${WHITE}` } }, right: { style: "thin", color: { argb: `FF${WHITE}` } } };
        if (col >= 4 && col <= 10) cell.numFmt = NUM_FMT;
      });

      downloadBlob(await wb.xlsx.writeBuffer(), `كشف_رواتب_${monthLabel}_${year}.xlsx`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ التصدير", description: "فشل تصدير الملف" });
    } finally {
      setIsExporting(false);
    }
  };

  // ── تصدير موظف واحد ────────────────────────────────────────────────────────
  const handleExportSingle = async (p: NonNullable<typeof payroll>[0]) => {
    try {
      const monthLabel   = MONTH_NAMES[month - 1] ?? month.toString();
      const branchLabel  = getBranchName(p.branchId);
      const wb = new ExcelJS.Workbook();
      wb.creator = "نظام المخبز";
      wb.created = new Date();
      const ws = wb.addWorksheet(`راتب ${p.employeeName}`, {
        views: [{ rightToLeft: true }],
        properties: { defaultRowHeight: 22 },
      });
      ws.columns = [{ width: 30 }, { width: 24 }];

      // عنوان
      const titleRow = ws.addRow([`كشف راتب: ${p.employeeName}`]);
      titleRow.height = 36;
      ws.mergeCells(1, 1, 1, 2);
      const tc = titleRow.getCell(1);
      tc.font      = { bold: true, size: 16, color: { argb: `FF${WHITE}` }, name: "Cairo" };
      tc.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
      tc.alignment = { horizontal: "center", vertical: "middle" };

      const subRow = ws.addRow([`شهر ${monthLabel} ${year}   |   فرع: ${branchLabel}`]);
      subRow.height = 18;
      ws.mergeCells(2, 1, 2, 2);
      const sc = subRow.getCell(1);
      sc.font      = { italic: true, size: 10, color: { argb: `FF${PRIMARY}` }, name: "Cairo" };
      sc.alignment = { horizontal: "center", vertical: "middle" };

      ws.addRow([]).height = 8;

      const rows: [string, number][] = [
        ["الراتب الأساسي",      Number(p.baseSalary)],
        ["إضافي",               Number(p.overtimeAmount)],
        ["مكافآت",              Number(p.bonusesAmount)],
        ["خصم غياب",           -Number(p.absenceDeduction)],
        ["أقساط سلف",          -Number(p.loanDeduction)],
        ["خصومات أخرى",        -Number(p.deductionsAmount)],
        ["صافي الراتب",         Number(p.finalAmount)],
      ];

      rows.forEach((r, i) => {
        const isFinal = i === rows.length - 1;
        const row = ws.addRow(r);
        row.height = 24;
        const bg = isFinal ? HEADER_BG : (i % 2 === 0 ? EVEN_BG : "FFFFFF");
        row.eachCell((cell, col) => {
          cell.border    = borderThin;
          cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg}` } };
          cell.alignment = { horizontal: col === 2 ? "center" : "right", vertical: "middle" };
          cell.font      = {
            bold:  isFinal,
            size:  isFinal ? 14 : 12,
            name:  "Cairo",
            color: isFinal ? { argb: `FF${WHITE}` } : undefined,
          };
          if (col === 2) cell.numFmt = NUM_FMT;
        });
      });

      downloadBlob(await wb.xlsx.writeBuffer(), `راتب_${p.employeeName}_${monthLabel}_${year}.xlsx`);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ التصدير", description: "فشل تصدير الملف" });
    }
  };

  if (isLoading) return <FullScreenLoader />;
  if (isError)   return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="كشوفات الرواتب"
        description="إدارة رواتب الموظفين وحسابها تلقائياً"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportExcel} disabled={!payroll?.length || isExporting} className="gap-2">
              <FileSpreadsheet size={16} className="text-green-600" />
              تصدير Excel
            </Button>
            <Button onClick={handleGenerateAll} disabled={generateMutation.isPending} className="gap-2 bg-primary">
              <PlayCircle size={16} />
              توليد كشوفات الشهر
            </Button>
          </div>
        }
      />

      <div className="flex gap-4 bg-card p-4 rounded-xl border border-border shadow-sm items-center">
        <div className="font-bold whitespace-nowrap">تصفية حسب:</div>
        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
          <SelectTrigger className="w-32 bg-background">
            <SelectValue placeholder="الشهر" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 12 }).map((_, i) => (
              <SelectItem key={i + 1} value={(i + 1).toString()}>شهر {i + 1}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-32 bg-background">
            <SelectValue placeholder="السنة" />
          </SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {(!payroll || payroll.length === 0) ? (
          <EmptyState
            icon={Wallet}
            title="لا يوجد كشوفات"
            description={`لم يتم توليد كشوفات رواتب لشهر ${month} / ${year} بعد.`}
            action={
              <Button onClick={handleGenerateAll} disabled={generateMutation.isPending} className="mt-4">
                توليد كشوفات الآن
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[200px]">الموظف</TableHead>
                  <TableHead>الأساسي</TableHead>
                  <TableHead>إضافي / مكافآت</TableHead>
                  <TableHead>غياب</TableHead>
                  <TableHead>سلف / خصم</TableHead>
                  <TableHead className="text-primary font-bold">الصافي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-right">عرض</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-semibold">{p.employeeName || "غير معروف"}</div>
                      <div className="text-xs text-muted-foreground">{getBranchName(p.branchId)}</div>
                    </TableCell>
                    <TableCell>{formatCurrency(p.baseSalary)}</TableCell>
                    <TableCell className="text-green-600 font-medium">+{formatCurrency(p.overtimeAmount + p.bonusesAmount)}</TableCell>
                    <TableCell className="text-destructive">-{formatCurrency(p.absenceDeduction)}</TableCell>
                    <TableCell className="text-destructive font-medium">-{formatCurrency(p.loanDeduction + p.deductionsAmount)}</TableCell>
                    <TableCell className="font-bold text-primary text-lg">{formatCurrency(p.finalAmount)}</TableCell>
                    <TableCell>
                      {p.status === PayrollStatus.finalized ? (
                        <Badge className="bg-green-500">معتمد</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10">مسودة</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/employees/${p.employeeId}`}>
                        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                          تفاصيل
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:bg-green-50"
                        title="تصدير راتب هذا الموظف"
                        onClick={() => handleExportSingle(p)}
                      >
                        <Download size={15} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
