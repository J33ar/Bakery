import React from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListLeaves, 
  useUpdateLeave,
  useGetCurrentUser, 
  UserRole,
  LeaveStatus,
  LeaveType
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { CalendarDays, Check, X, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useCreateLeave, useListEmployees } from "@workspace/api-client-react";


export default function Leaves() {
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;
  
  const { data: leaves, isLoading, isError, refetch } = useListLeaves(
    { branchId },
    { query: { enabled: !!user, queryKey: ['leaves', branchId] } }
  );

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [cForm, setCForm] = React.useState<{ employeeId: string; type: string; startDate: string; endDate: string; days: string; paid: boolean; reason: string }>({ employeeId: "", type: LeaveType.annual, startDate: "", endDate: "", days: "", paid: true, reason: "" });

  const { data: employees } = useListEmployees(
    { branchId },
    { query: { enabled: !!user, queryKey: ['employees', branchId] } }
  );

  const createLeave = useCreateLeave({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم", description: "تم تقديم طلب الإجازة بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['leaves'] });
        setIsCreateOpen(false);
        setCForm({ employeeId: "", type: LeaveType.annual, startDate: "", endDate: "", days: "", paid: true, reason: "" });
      },
      onError: (e: any) => toast({ variant: "destructive", title: "خطأ", description: e.message })
    }
  });

  const handleCreateLeave = () => {
    if (!cForm.employeeId) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى اختيار الموظف" });
      return;
    }
    if (!cForm.startDate) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى تحديد تاريخ بداية الإجازة" });
      return;
    }
    if (!cForm.endDate) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى تحديد تاريخ نهاية الإجازة" });
      return;
    }
    if (new Date(cForm.endDate) < new Date(cForm.startDate)) {
      toast({ variant: "destructive", title: "تاريخ غير صحيح", description: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" });
      return;
    }
    if (!cForm.days || parseFloat(cForm.days) <= 0) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال عدد أيام الإجازة" });
      return;
    }
    createLeave.mutate({
      data: {
        employeeId: cForm.employeeId,
        type: cForm.type as LeaveType,
        startDate: cForm.startDate,
        endDate: cForm.endDate,
        days: parseFloat(cForm.days),
        paid: cForm.paid,
        reason: cForm.reason || undefined
      }
    });
  };

  const calculateDays = (start: string, end: string) => {
    if(!start || !end) return;
    const s = new Date(start);
    const e = new Date(end);
    if(e >= s) {
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setCForm(prev => ({...prev, days: diffDays.toString()}));
    }
  };

  const updateLeaveMutation = useUpdateLeave({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم تحديث الحالة", description: "تم معالجة طلب الإجازة بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['leaves'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      }
    }
  });

  const handleAction = (id: string, status: LeaveStatus) => {
    updateLeaveMutation.mutate({
      id,
      data: { status }
    });
  };

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const pendingLeaves = leaves?.filter(l => l.status === LeaveStatus.pending) || [];
  const historyLeaves = leaves?.filter(l => l.status !== LeaveStatus.pending) || [];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="إدارة الإجازات" 
        description="متابعة واعتماد طلبات إجازات الموظفين"
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary">تقديم إجازة لموظف</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>طلب إجازة جديدة</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>الموظف</Label>
                  <Select value={cForm.employeeId} onValueChange={v => setCForm({...cForm, employeeId: v})}>
                    <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                    <SelectContent>
                      {employees?.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>نوع الإجازة</Label>
                  <Select value={cForm.type} onValueChange={v => setCForm({...cForm, type: v as LeaveType, paid: v !== LeaveType.unpaid})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LeaveType.annual}>سنوية</SelectItem>
                      <SelectItem value={LeaveType.sick}>مرضية</SelectItem>
                      <SelectItem value={LeaveType.emergency}>طارئة</SelectItem>
                      <SelectItem value={LeaveType.unpaid}>بدون راتب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>من تاريخ</Label>
                    <Input type="date" value={cForm.startDate} onChange={e => {
                      setCForm({...cForm, startDate: e.target.value});
                      calculateDays(e.target.value, cForm.endDate);
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label>إلى تاريخ</Label>
                    <Input type="date" value={cForm.endDate} onChange={e => {
                      setCForm({...cForm, endDate: e.target.value});
                      calculateDays(cForm.startDate, e.target.value);
                    }} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <Label>عدد الأيام</Label>
                    <Input type="number" value={cForm.days} onChange={e => setCForm({...cForm, days: e.target.value})} />
                  </div>
                  <div className="flex flex-col gap-2 pt-6">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="paid" checked={cForm.paid} onChange={e => setCForm({...cForm, paid: e.target.checked})} className="h-4 w-4" disabled={(cForm.type as string) === 'unpaid'} />
                      <Label htmlFor="paid">إجازة مدفوعة</Label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>السبب (اختياري)</Label>
                  <Textarea value={cForm.reason} onChange={e => setCForm({...cForm, reason: e.target.value})} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateLeave} disabled={createLeave.isPending || !cForm.employeeId || !cForm.startDate || !cForm.endDate}>حفظ الطلب</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-card border border-border h-12 w-full max-w-md">
          <TabsTrigger value="pending" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
            طلبات قيد الانتظار
            {pendingLeaves.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                {pendingLeaves.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            سجل الإجازات
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {pendingLeaves.length === 0 ? (
              <EmptyState 
                icon={CalendarDays}
                title="لا يوجد طلبات" 
                description="جميع طلبات الإجازات تمت معالجتها."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>الموظف</TableHead>
                      <TableHead>نوع الإجازة</TableHead>
                      <TableHead>من تاريخ</TableHead>
                      <TableHead>إلى تاريخ</TableHead>
                      <TableHead>المدة</TableHead>
                      <TableHead>مدفوعة</TableHead>
                      <TableHead>السبب</TableHead>
                      <TableHead className="text-right">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLeaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-bold">{leave.employeeName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-background">
                            {leave.type === LeaveType.annual ? "سنوية" : 
                             leave.type === LeaveType.sick ? "مرضية" : 
                             leave.type === LeaveType.emergency ? "طارئة" : "غير مدفوعة"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(leave.startDate)}</TableCell>
                        <TableCell>{formatDate(leave.endDate)}</TableCell>
                        <TableCell className="font-bold">{leave.days} يوم</TableCell>
                        <TableCell>{leave.paid ? <span className="text-green-600 font-bold">نعم</span> : <span className="text-muted-foreground">لا</span>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={leave.reason || ""}>
                          {leave.reason || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                              onClick={() => handleAction(leave.id, LeaveStatus.approved)}
                              disabled={updateLeaveMutation.isPending}
                              title="موافقة"
                            >
                              <Check size={16} />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleAction(leave.id, LeaveStatus.rejected)}
                              disabled={updateLeaveMutation.isPending}
                              title="رفض"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
             {historyLeaves.length === 0 ? (
              <EmptyState 
                icon={CalendarDays}
                title="سجل فارغ" 
                description="لا يوجد سجلات سابقة للإجازات."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>الموظف</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المدة</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLeaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-bold">{leave.employeeName}</TableCell>
                        <TableCell>
                          {leave.type === LeaveType.annual ? "سنوية" : 
                           leave.type === LeaveType.sick ? "مرضية" : 
                           leave.type === LeaveType.emergency ? "طارئة" : "غير مدفوعة"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(leave.startDate)} <span className="text-muted-foreground mx-1">إلى</span> {formatDate(leave.endDate)}
                        </TableCell>
                        <TableCell>{leave.days} يوم</TableCell>
                        <TableCell>
                          {leave.status === LeaveStatus.approved ? (
                            <Badge className="bg-green-500">مقبولة</Badge>
                          ) : (
                            <Badge variant="destructive">مرفوضة</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
