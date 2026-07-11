import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListAttendance, 
  useCreateAttendance, 
  useCheckIn, 
  useCheckOut, 
  useUpdateAttendance, 
  useGetCurrentUser, 
  UserRole,
  useListEmployees,
  AttendanceStatus
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDate, formatTime, formatMinutesAsHours } from "@/lib/format";
import { Clock, LogIn, LogOut, Check, CalendarDays, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export default function Attendance() {
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── كل الـ state في الأعلى قبل أي return ──
  const [date, setDate] = React.useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editRecord, setEditRecord] = React.useState<any>(null);
  const [eForm, setEForm] = React.useState({
    checkIn: "",
    checkOut: "",
    status: AttendanceStatus.present,
    notes: "",
    employeeId: "",
  });

  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;

  const { data: attendanceData, isLoading, isError, refetch } = useListAttendance(
    { branchId, date },
    { query: { enabled: !!user, queryKey: ["attendance", branchId, date] } }
  );

  const { data: employees } = useListEmployees(
    { branchId, status: "active" },
    { query: { enabled: !!user, queryKey: ["employees-active", branchId] } }
  );

  const checkInMutation = useCheckIn({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم تسجيل الدخول", description: "تم تسجيل وقت الدخول بنجاح" });
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "خطأ", description: err.message || "حدث خطأ أثناء التسجيل" });
      },
    },
  });

  const checkOutMutation = useCheckOut({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم تسجيل الخروج", description: "تم تسجيل وقت الخروج بنجاح" });
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "خطأ", description: err.message || "حدث خطأ أثناء التسجيل" });
      },
    },
  });

  const createAttendanceMutation = useCreateAttendance({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم تسجيل الغياب", description: "تم تحديث الحالة بنجاح" });
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
      },
    },
  });

  const updateAttendanceMutation = useUpdateAttendance({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم التعديل", description: "تم تعديل السجل بنجاح" });
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
        setIsEditOpen(false);
      },
      onError: (e: any) =>
        toast({ variant: "destructive", title: "خطأ", description: e.message }),
    },
  });

  // ── بعد كل الـ hooks، يمكن الـ early returns ──
  if (isLoading) return <FullScreenLoader />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const isToday = date === format(new Date(), "yyyy-MM-dd");
  const attendanceMap = new Map((attendanceData ?? []).map((a) => [a.employeeId, a]));

  const openEdit = (employee: any, record: any) => {
    setEditRecord(record);
    setEForm({
      employeeId: employee.id,
      checkIn: record?.checkIn ? record.checkIn.substring(11, 16) : "",
      checkOut: record?.checkOut ? record.checkOut.substring(11, 16) : "",
      status: record?.status || AttendanceStatus.present,
      notes: record?.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    const noTime = eForm.status === AttendanceStatus.absent || eForm.status === AttendanceStatus.leave;

    const data: any = {
      status: eForm.status,
      notes: eForm.notes || undefined,
      employeeId: eForm.employeeId,
      date,
      checkIn: noTime ? null : eForm.checkIn ? new Date(date + "T" + eForm.checkIn).toISOString() : null,
      checkOut: noTime ? null : eForm.checkOut ? new Date(date + "T" + eForm.checkOut).toISOString() : null,
    };

    if (editRecord?.id) {
      updateAttendanceMutation.mutate({ id: editRecord.id, data });
    } else {
      createAttendanceMutation.mutate({ data });
      setIsEditOpen(false);
    }
  };

  const handleAbsent = (employeeId: string) => {
    createAttendanceMutation.mutate({
      data: { employeeId, date, status: AttendanceStatus.absent },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحضور والانصراف"
        description="تسجيل ومتابعة دوام الموظفين اليومي"
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm justify-between items-center">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <CalendarDays size={24} />
          </div>
          <div>
            <h3 className="font-bold">سجل يوم:</h3>
            <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-background max-w-[200px]"
          />
          {date !== format(new Date(), "yyyy-MM-dd") && (
            <Button variant="outline" onClick={() => setDate(format(new Date(), "yyyy-MM-dd"))}>
              اليوم
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {!employees || employees.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="لا يوجد موظفين"
            description="لا يوجد موظفين نشطين في هذا الفرع."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[250px]">الموظف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>وقت الدخول</TableHead>
                  <TableHead>وقت الخروج</TableHead>
                  <TableHead>العمل / الإضافي</TableHead>
                  <TableHead className="text-right">الإجراء السريع</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const record = attendanceMap.get(employee.id);
                  const status = record?.status;

                  return (
                    <TableRow key={employee.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-semibold">{employee.fullName}</div>
                        <div className="text-xs text-muted-foreground">
                          {employee.jobTitle} - {employee.branchName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!record ? (
                          <Badge variant="outline" className="text-muted-foreground">لم يسجل</Badge>
                        ) : status === AttendanceStatus.present || status === AttendanceStatus.late ? (
                          <Badge className="bg-green-500">
                            حاضر {status === AttendanceStatus.late && "(متأخر)"}
                          </Badge>
                        ) : status === AttendanceStatus.absent ? (
                          <Badge variant="destructive">غائب</Badge>
                        ) : (
                          <Badge variant="secondary">مجاز</Badge>
                        )}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right font-mono">
                        {record?.checkIn ? formatTime(record.checkIn) : "-"}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right font-mono">
                        {record?.checkOut ? formatTime(record.checkOut) : "-"}
                      </TableCell>
                      <TableCell>
                        {record?.workMinutes ? (
                          <div className="text-sm">
                            <div>{formatMinutesAsHours(record.workMinutes)}</div>
                            {record.overtimeMinutes ? (
                              <div className="text-xs text-green-600 font-medium">
                                +{formatMinutesAsHours(record.overtimeMinutes)} إضافي
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {isToday &&
                            (!record ||
                              (record.status !== AttendanceStatus.absent &&
                                record.status !== AttendanceStatus.leave)) && (
                              <>
                                {!record?.checkIn && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="h-8 gap-1 bg-primary hover:bg-primary/90"
                                      onClick={() =>
                                        checkInMutation.mutate({ data: { employeeId: employee.id } })
                                      }
                                      disabled={checkInMutation.isPending}
                                    >
                                      <LogIn size={14} /> دخول
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                                      onClick={() => handleAbsent(employee.id)}
                                      disabled={createAttendanceMutation.isPending}
                                    >
                                      تسجيل غياب
                                    </Button>
                                  </>
                                )}
                                {record?.checkIn && !record?.checkOut && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 gap-1"
                                    onClick={() =>
                                      checkOutMutation.mutate({ data: { employeeId: employee.id } })
                                    }
                                    disabled={checkOutMutation.isPending}
                                  >
                                    <LogOut size={14} /> انصراف
                                  </Button>
                                )}
                                {record?.checkOut && (
                                  <Badge
                                    variant="outline"
                                    className="h-8 flex items-center gap-1 text-green-600 border-green-600/30 bg-green-500/5"
                                  >
                                    <Check size={14} /> مكتمل
                                  </Badge>
                                )}
                              </>
                            )}
                          {!isToday && !record && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => handleAbsent(employee.id)}
                              disabled={createAttendanceMutation.isPending}
                            >
                              تسجيل غياب
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                          onClick={() => openEdit(employee, record)}
                        >
                          <Edit size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل سجل الحضور</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">

            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select
                value={eForm.status}
                onValueChange={(v: any) => {
                  // امسح الأوقات تلقائياً لما الحالة غائب أو إجازة
                  const clearTimes = v === AttendanceStatus.absent || v === AttendanceStatus.leave;
                  setEForm({
                    ...eForm,
                    status: v,
                    checkIn: clearTimes ? "" : eForm.checkIn,
                    checkOut: clearTimes ? "" : eForm.checkOut,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AttendanceStatus.present}>حاضر</SelectItem>
                  <SelectItem value={AttendanceStatus.late}>متأخر</SelectItem>
                  <SelectItem value={AttendanceStatus.absent}>غائب</SelectItem>
                  <SelectItem value={AttendanceStatus.leave}>إجازة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* حقول الوقت — تظهر فقط للحاضر والمتأخر */}
            {(eForm.status === AttendanceStatus.present || eForm.status === AttendanceStatus.late) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>وقت الدخول</Label>
                  <Input
                    type="time"
                    value={eForm.checkIn}
                    onChange={(e) => setEForm({ ...eForm, checkIn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>وقت الخروج</Label>
                  <Input
                    type="time"
                    value={eForm.checkOut}
                    onChange={(e) => setEForm({ ...eForm, checkOut: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={eForm.notes}
                onChange={(e) => setEForm({ ...eForm, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdate}
              disabled={
                updateAttendanceMutation.isPending || createAttendanceMutation.isPending
              }
            >
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
