import React from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListPayroll, 
  useGeneratePayroll,
  useGetCurrentUser, 
  UserRole,
  PayrollStatus
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { Wallet, FileSpreadsheet, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";

export default function Payroll() {
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const [month, setMonth] = React.useState<number>(currentMonth);
  const [year, setYear] = React.useState<number>(currentYear);
  const [isExporting, setIsExporting] = React.useState(false);
  
  const { data: payroll, isLoading, isError, refetch } = useListPayroll(
    { branchId, month, year },
    { query: { enabled: !!user, queryKey: ['payroll', branchId, month, year] } }
  );

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
    generateMutation.mutate({
      data: { employeeId: "all", month, year }
    });
  };

  const handleExportExcel = async () => {
    if (!payroll || payroll.length === 0) return;
    setIsExporting(true);
    try {
      const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
      const monthLabel = monthNames[month - 1] ?? month.toString();

      const wb = new ExcelJS.Workbook();
      wb.creator = "نظام المخبز";
      wb.created = new Date();

      const ws = wb.addWorksheet(`رواتب ${monthLabel} ${year}`, {
        views: [{ rightToLeft: true }],
        properties: { defaultRowHeight: 20 },
      });

      // ── عرض الأعمدة ──
      ws.columns = [
        { width: 6  },  // م
        { width: 28 },  // الاسم
        { width: 16 },  // الفرع
        { width: 16 },  // الأساسي
        { width: 14 },  // إضافي
        { width: 14 },  // مكافآت
        { width: 14 },  // غياب
        { width: 14 },  // سلف
        { width: 16 },  // خصومات
        { width: 16 },  // صافي
        { width: 12 },  // حالة
      ];

      // ── الألوان ──
      const PRIMARY       = "C2410C"; // برتقالي غامق
      const HEADER_BG     = "EA580C"; // برتقالي
      const TOTAL_BG      = "7C2D12"; // بني
      const EVEN_BG       = "FFF7ED"; // كريمي
      const ODD_BG        = "FFFFFF"; // أبيض
      const WHITE         = "FFFFFF";
      const GREEN         = "15803D";
      const AMBER         = "B45309";

      const borderThin: Partial<ExcelJS.Borders> = {
        top:    { style: "thin",  color: { argb: "FFDDDDDD" } },
        bottom: { style: "thin",  color: { argb: "FFDDDDDD" } },
        left:   { style: "thin",  color: { argb: "FFDDDDDD" } },
        right:  { style: "thin",  color: { argb: "FFDDDDDD" } },
      };
      const borderWhite: Partial<ExcelJS.Borders> = {
        top:    { style: "thin", color: { argb: `FF${WHITE}` } },
        bottom: { style: "thin", color: { argb: `FF${WHITE}` } },
        left:   { style: "thin", color: { argb: `FF${WHITE}` } },
        right:  { style: "thin", color: { argb: `FF${WHITE}` } },
      };

      // ── صف العنوان ──
      const titleRow = ws.addRow([`كشف رواتب شهر ${monthLabel} ${year}`]);
      titleRow.height = 40;
      ws.mergeCells(1, 1, 1, 11);
      const titleCell = titleRow.getCell(1);
      titleCell.font  = { bold: true, size: 18, color: { argb: `FF${WHITE}` }, name: "Cairo" };
      titleCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.border = borderWhite;

      // صف فارغ
      ws.addRow([]).height = 6;

      // ── معلومات التصدير ──
      const infoRow = ws.addRow([`تاريخ الإصدار: ${new Date().toLocaleDateString("ar-JO")}   |   عدد الموظفين: ${payroll.length}`]);
      ws.mergeCells(3, 1, 3, 11);
      infoRow.height = 18;
      const infoCell = infoRow.getCell(1);
      infoCell.font = { italic: true, size: 10, color: { argb: `FF${PRIMARY}` }, name: "Cairo" };
      infoCell.alignment = { horizontal: "center", vertical: "middle" };

      // صف فارغ
      ws.addRow([]).height = 4;

      // ── رأس الجدول ──
      const headers = ["م", "اسم الموظف", "الفرع", "الراتب الأساسي", "إضافي", "مكافآت", "خصم غياب", "أقساط سلف", "خصومات أخرى", "صافي الراتب", "الحالة"];
      const headerRow = ws.addRow(headers);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font      = { bold: true, size: 12, color: { argb: `FF${WHITE}` }, name: "Cairo" };
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border    = borderWhite;
      });

      // ── صفوف البيانات ──
      const numFmt = '#,##0.00';
      payroll.forEach((p, i) => {
        const isEven = i % 2 === 0;
        const bg = isEven ? EVEN_BG : ODD_BG;
        const row = ws.addRow([
          i + 1,
          p.employeeName || "-",
          p.branchName   || "-",
          Number(p.baseSalary),
          Number(p.overtimeAmount),
          Number(p.bonusesAmount),
          Number(p.absenceDeduction),
          Number(p.loanDeduction),
          Number(p.deductionsAmount),
          Number(p.finalAmount),
          p.status === PayrollStatus.finalized ? "معتمد" : "مسودة",
        ]);
        row.height = 22;

        row.eachCell((cell, colNum) => {
          cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg}` } };
          cell.border = borderThin;
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.font = { size: 11, name: "Cairo" };

          // الأرقام
          if (colNum >= 4 && colNum <= 10) {
            cell.numFmt = numFmt;
          }
          // صافي الراتب — مميز
          if (colNum === 10) {
            cell.font = { bold: true, size: 13, color: { argb: `FF${PRIMARY}` }, name: "Cairo" };
          }
          // الحالة
          if (colNum === 11) {
            const isApproved = cell.value === "معتمد";
            cell.font = { bold: true, size: 10, color: { argb: `FF${isApproved ? GREEN : AMBER}` }, name: "Cairo" };
          }
        });
      });

      // ── صف الإجمالي ──
      const totals = [
        "",
        "الإجمالي الكلي",
        "",
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
      totalRow.eachCell((cell, colNum) => {
        cell.font   = { bold: true, size: 13, color: { argb: `FF${WHITE}` }, name: "Cairo" };
        cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${TOTAL_BG}` } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top:    { style: "medium", color: { argb: `FF${WHITE}` } },
          bottom: { style: "medium", color: { argb: `FF${WHITE}` } },
          left:   { style: "thin",   color: { argb: `FF${WHITE}` } },
          right:  { style: "thin",   color: { argb: `FF${WHITE}` } },
        };
        if (colNum >= 4 && colNum <= 10) cell.numFmt = numFmt;
      });

      // ── تحميل الملف ──
      const buffer = await wb.xlsx.writeBuffer();
      const blob   = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement("a");
      a.href       = url;
      a.download   = `كشف_رواتب_${monthLabel}_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "خطأ التصدير", description: "فشل تصدير الملف" });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <ErrorState onRetry={refetch} />;

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
            {Array.from({length: 12}).map((_, i) => (
              <SelectItem key={i+1} value={(i+1).toString()}>شهر {i+1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-32 bg-background">
            <SelectValue placeholder="السنة" />
          </SelectTrigger>
          <SelectContent>
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
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
                      <div className="text-xs text-muted-foreground">{p.branchName}</div>
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
