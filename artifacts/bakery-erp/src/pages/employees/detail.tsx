import React from "react";
import { useParams, useLocation, Link } from "wouter";
import { 
  useGetEmployeeFullRecord, 
  EmployeeStatus, 
  ContractType,
  AttendanceStatus,
  LeaveStatus,
  LeaveType,
  PayrollStatus
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatTime, formatMinutesAsHours } from "@/lib/format";
import { Phone, MapPin, Calendar, Briefcase, FileText, Clock, Wallet, ArrowRight, ArrowDownRight, ArrowUpRight, ShieldCheck, Activity, Edit } from "lucide-react";

export default function EmployeeDetail() {
  const params = useParams();
  const [, navigate] = useLocation();
  const id = params.id || "";

  const { data: record, isLoading, isError, refetch } = useGetEmployeeFullRecord(
    id,
    { query: { enabled: !!id, queryKey: ['employee-full-record', id] } }
  );

  if (isLoading) return <FullScreenLoader />;
  if (isError || !record) return <ErrorState onRetry={refetch} />;

  const { employee, attendance, leaves, bonuses, deductions, loans, payroll } = record;

  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.active: return <Badge className="bg-green-500 hover:bg-green-600">نشط</Badge>;
      case EmployeeStatus.suspended: return <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/30">موقوف</Badge>;
      case EmployeeStatus.resigned: return <Badge variant="outline" className="text-muted-foreground">مستقيل</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getContractName = (type: ContractType) => {
    switch (type) {
      case ContractType.full_time: return "دوام كامل";
      case ContractType.part_time: return "دوام جزئي";
      case ContractType.temporary: return "مؤقت";
      default: return type;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="outline" size="icon" onClick={() => navigate("/employees")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold font-serif">ملف الموظف</h1>
        <div className="flex-1"></div>
        <Link href={`/employees/${id}/edit`}>
          <Button className="gap-2"><Edit size={16} />تعديل الموظف</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="md:col-span-1 border-border shadow-sm overflow-hidden relative">
          <div className="h-24 bg-primary/20 absolute top-0 left-0 right-0 w-full z-0"></div>
          <CardContent className="pt-12 relative z-10 flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 border-4 border-card shadow-md mb-4">
              {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={employee.fullName} />}
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                {employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold text-foreground mb-1">{employee.fullName}</h2>
            <p className="text-primary font-medium mb-3">{employee.jobTitle}</p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {getStatusBadge(employee.status)}
              <Badge variant="outline">{employee.branchName}</Badge>
              <Badge variant="outline">{employee.department}</Badge>
            </div>

            <div className="w-full space-y-4 text-sm text-right">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">الرقم الوظيفي</p>
                  <p className="font-mono font-medium">{employee.employeeNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">الرقم الوطني</p>
                  <p className="font-medium">{employee.nationalId || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                  <p className="font-mono font-medium">{employee.phone || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">العنوان</p>
                  <p className="font-medium">{employee.address || "-"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info & Stats */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20 shadow-none">
              <CardContent className="p-4">
                <Wallet className="w-6 h-6 text-primary mb-2" />
                <p className="text-xs text-muted-foreground mb-1">الراتب الأساسي</p>
                <p className="text-xl font-bold text-primary font-serif">{formatCurrency(employee.baseSalary)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <Briefcase className="w-6 h-6 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-1">نوع العقد</p>
                <p className="text-lg font-bold">{getContractName(employee.contractType)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <Calendar className="w-6 h-6 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-1">تاريخ التعيين</p>
                <p className="text-lg font-bold" dir="ltr">{formatDate(employee.hireDate)}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <Activity className="w-6 h-6 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-1">نسبة الحضور</p>
                <p className="text-lg font-bold">
                  {attendance.length > 0 
                    ? `${Math.round((attendance.filter(a => a.status === AttendanceStatus.present || a.status === AttendanceStatus.late).length / attendance.length) * 100)}%` 
                    : "-"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="attendance" className="w-full">
            <TabsList className="w-full bg-card border border-border h-12">
              <TabsTrigger value="attendance" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">الحضور</TabsTrigger>
              <TabsTrigger value="financials" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">المالية</TabsTrigger>
              <TabsTrigger value="leaves" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">الإجازات</TabsTrigger>
              <TabsTrigger value="payroll" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">الرواتب</TabsTrigger>
            </TabsList>
            
            <TabsContent value="attendance" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">سجل الحضور والانصراف (آخر 30 يوم)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>الدخول</TableHead>
                          <TableHead>الخروج</TableHead>
                          <TableHead>ساعات العمل</TableHead>
                          <TableHead>تأخير / إضافي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendance.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد سجلات حضور</TableCell></TableRow>
                        ) : (
                          attendance.slice(0, 30).map(a => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">{formatDate(a.date)}</TableCell>
                              <TableCell>
                                {a.status === AttendanceStatus.present && <Badge className="bg-green-500">حاضر</Badge>}
                                {a.status === AttendanceStatus.absent && <Badge variant="destructive">غائب</Badge>}
                                {a.status === AttendanceStatus.late && <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">متأخر</Badge>}
                                {a.status === AttendanceStatus.leave && <Badge variant="outline">مجاز</Badge>}
                              </TableCell>
                              <TableCell dir="ltr" className="text-right">{formatTime(a.checkIn)}</TableCell>
                              <TableCell dir="ltr" className="text-right">{formatTime(a.checkOut)}</TableCell>
                              <TableCell><span dir="ltr">{formatMinutesAsHours(a.workMinutes)}</span></TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1 text-xs">
                                  {a.lateMinutes ? <span className="text-destructive font-medium flex items-center gap-1"><ArrowDownRight size={12}/> تأخير: {a.lateMinutes} د</span> : null}
                                  {a.overtimeMinutes ? <span className="text-green-600 font-medium flex items-center gap-1"><ArrowUpRight size={12}/> إضافي: {formatMinutesAsHours(a.overtimeMinutes)}</span> : null}
                                  {!a.lateMinutes && !a.overtimeMinutes && <span className="text-muted-foreground">-</span>}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Implement other tabs similarly... */}
            <TabsContent value="financials" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="bg-green-500/5 pb-3">
                    <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5" /> المكافآت السابقة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {bonuses.length === 0 ? <p className="text-sm text-muted-foreground">لا يوجد مكافآت مسجلة</p> : (
                      <div className="space-y-3">
                        {bonuses.map(b => (
                          <div key={b.id} className="flex justify-between items-center pb-2 border-b border-border last:border-0 last:pb-0">
                            <div>
                              <p className="font-medium text-sm">{b.reason}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(b.date)}</p>
                            </div>
                            <span className="font-bold text-green-600">+{formatCurrency(b.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="bg-destructive/5 pb-3">
                    <CardTitle className="text-lg text-destructive flex items-center gap-2">
                      <ArrowDownRight className="w-5 h-5" /> الخصومات السابقة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {deductions.length === 0 ? <p className="text-sm text-muted-foreground">لا يوجد خصومات مسجلة</p> : (
                      <div className="space-y-3">
                        {deductions.map(d => (
                          <div key={d.id} className="flex justify-between items-center pb-2 border-b border-border last:border-0 last:pb-0">
                            <div>
                              <p className="font-medium text-sm">{d.reason}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(d.date)}</p>
                            </div>
                            <span className="font-bold text-destructive">-{formatCurrency(d.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">السلف النشطة</CardTitle>
                </CardHeader>
                <CardContent>
                  {loans.filter(l => l.remaining > 0).length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">لا يوجد سلف نشطة</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>قيمة السلفة</TableHead>
                          <TableHead>القسط الشهري</TableHead>
                          <TableHead>المتبقي</TableHead>
                          <TableHead>التقدم</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loans.filter(l => l.remaining > 0).map(l => (
                          <TableRow key={l.id}>
                            <TableCell>{formatDate(l.date)}</TableCell>
                            <TableCell className="font-bold">{formatCurrency(l.amount)}</TableCell>
                            <TableCell>{formatCurrency(l.installment)}</TableCell>
                            <TableCell className="text-destructive font-bold">{formatCurrency(l.remaining)}</TableCell>
                            <TableCell className="w-[150px]">
                              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-primary h-full" 
                                  style={{ width: `${((l.amount - l.remaining) / l.amount) * 100}%` }}
                                ></div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaves" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">سجل الإجازات</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>النوع</TableHead>
                        <TableHead>من</TableHead>
                        <TableHead>إلى</TableHead>
                        <TableHead>الأيام</TableHead>
                        <TableHead>مدفوعة</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد سجلات إجازات</TableCell></TableRow>
                      ) : (
                        leaves.map(l => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium">
                              {l.type === LeaveType.annual ? "سنوية" : 
                               l.type === LeaveType.sick ? "مرضية" : 
                               l.type === LeaveType.emergency ? "طارئة" : "غير مدفوعة"}
                            </TableCell>
                            <TableCell>{formatDate(l.startDate)}</TableCell>
                            <TableCell>{formatDate(l.endDate)}</TableCell>
                            <TableCell>{l.days}</TableCell>
                            <TableCell>{l.paid ? <Badge className="bg-green-500">نعم</Badge> : <Badge variant="secondary">لا</Badge>}</TableCell>
                            <TableCell>
                              {l.status === LeaveStatus.approved && <Badge className="bg-green-500">مقبولة</Badge>}
                              {l.status === LeaveStatus.pending && <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">قيد الانتظار</Badge>}
                              {l.status === LeaveStatus.rejected && <Badge variant="destructive">مرفوضة</Badge>}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payroll" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">كشوفات الرواتب السابقة</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الشهر/السنة</TableHead>
                        <TableHead>الأساسي</TableHead>
                        <TableHead>إضافي ومكافآت</TableHead>
                        <TableHead>خصومات وسلف</TableHead>
                        <TableHead>الصافي</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payroll.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا يوجد كشوفات مسجلة</TableCell></TableRow>
                      ) : (
                        payroll.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-bold">{p.month} / {p.year}</TableCell>
                            <TableCell>{formatCurrency(p.baseSalary)}</TableCell>
                            <TableCell className="text-green-600">+{formatCurrency(p.overtimeAmount + p.bonusesAmount)}</TableCell>
                            <TableCell className="text-destructive">-{formatCurrency(p.deductionsAmount + p.loanDeduction + p.absenceDeduction)}</TableCell>
                            <TableCell className="font-bold text-primary text-lg">{formatCurrency(p.finalAmount)}</TableCell>
                            <TableCell>
                              {p.status === PayrollStatus.finalized ? <Badge className="bg-green-500">معتمد</Badge> : <Badge variant="outline">مسودة</Badge>}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
