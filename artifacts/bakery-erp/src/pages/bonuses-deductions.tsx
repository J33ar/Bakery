import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListBonuses, 
  useListDeductions,
  useCreateBonus,
  useCreateDeduction,
  useDeleteBonus,
  useDeleteDeduction,
  useGetCurrentUser, 
  UserRole,
  useListEmployees
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { Gift, ArrowDownRight, ArrowUpRight, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function BonusesDeductions() {
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;
  
  const [isBonusOpen, setIsBonusOpen] = React.useState(false);
  const [isDeductionOpen, setIsDeductionOpen] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [date, setDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  
  const { data: bonuses, isLoading: loadingBonuses } = useListBonuses(
    { branchId },
    { query: { enabled: !!user, queryKey: ['bonuses', branchId] } }
  );

  const { data: deductions, isLoading: loadingDeductions } = useListDeductions(
    { branchId },
    { query: { enabled: !!user, queryKey: ['deductions', branchId] } }
  );

  const { data: employees } = useListEmployees(
    { branchId, status: "active" },
    { query: { enabled: !!user, queryKey: ['employees-active', branchId] } }
  );

  const createBonus = useCreateBonus({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الإضافة", description: "تم إضافة المكافأة بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['bonuses'] });
        setIsBonusOpen(false);
        resetForm();
      }
    }
  });

  const createDeduction = useCreateDeduction({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الإضافة", description: "تم إضافة الخصم بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['deductions'] });
        setIsDeductionOpen(false);
        resetForm();
      }
    }
  });

  const deleteBonus = useDeleteBonus({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم حذف المكافأة بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['bonuses'] });
      }
    }
  });

  const deleteDeduction = useDeleteDeduction({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم حذف الخصم بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['deductions'] });
      }
    }
  });

  const resetForm = () => {
    setEmployeeId("");
    setAmount("");
    setReason("");
    setDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleCreateBonus = () => {
    if (!employeeId) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى اختيار الموظف" });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال قيمة المكافأة (أكبر من صفر)" });
      return;
    }
    if (!reason.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال سبب المكافأة" });
      return;
    }
    createBonus.mutate({ data: { employeeId, amount: parseFloat(amount), reason, date } });
  };

  const handleCreateDeduction = () => {
    if (!employeeId) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى اختيار الموظف" });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال قيمة الخصم (أكبر من صفر)" });
      return;
    }
    if (!reason.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال سبب الخصم" });
      return;
    }
    createDeduction.mutate({ data: { employeeId, amount: parseFloat(amount), reason, date } });
  };

  if (loadingBonuses || loadingDeductions) return <FullScreenLoader />;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="المكافآت والخصومات" 
        description="إدارة الحوافز والخصومات للموظفين"
      />

      <Tabs defaultValue="bonuses" className="w-full">
        <TabsList className="bg-card border border-border h-12 w-full max-w-md">
          <TabsTrigger value="bonuses" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2">
            <ArrowUpRight size={16} /> المكافآت
          </TabsTrigger>
          <TabsTrigger value="deductions" className="flex-1 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground flex items-center gap-2">
            <ArrowDownRight size={16} /> الخصومات
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="bonuses" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={isBonusOpen} onOpenChange={setIsBonusOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 gap-2">
                  <Plus size={16} /> إضافة مكافأة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة مكافأة جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>الموظف</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموظف" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>{emp.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>القيمة</Label>
                    <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>السبب</Label>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: أداء ممتاز" />
                  </div>
                  <div className="space-y-2">
                    <Label>التاريخ</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <Button onClick={handleCreateBonus} disabled={createBonus.isPending || !employeeId || !amount || !reason} className="w-full bg-green-600 hover:bg-green-700">
                    حفظ المكافأة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {(!bonuses || bonuses.length === 0) ? (
              <EmptyState 
                icon={Gift}
                title="لا يوجد مكافآت" 
                description="لم يتم تسجيل أي مكافآت في هذا الفرع."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الموظف</TableHead>
                      <TableHead>السبب</TableHead>
                      <TableHead>القيمة</TableHead>
                      <TableHead className="text-right">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bonuses.map((bonus) => (
                      <TableRow key={bonus.id}>
                        <TableCell>{formatDate(bonus.date)}</TableCell>
                        <TableCell className="font-bold">{bonus.employeeName}</TableCell>
                        <TableCell>{bonus.reason}</TableCell>
                        <TableCell className="font-bold text-green-600">+{formatCurrency(bonus.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => deleteBonus.mutate({ id: bonus.id })}
                            disabled={deleteBonus.isPending}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="deductions" className="mt-6 space-y-4">
           <div className="flex justify-end">
            <Dialog open={isDeductionOpen} onOpenChange={setIsDeductionOpen}>
              <DialogTrigger asChild>
                <Button className="bg-destructive hover:bg-destructive/90 gap-2 text-destructive-foreground">
                  <Plus size={16} /> إضافة خصم
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة خصم جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>الموظف</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموظف" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>{emp.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>القيمة</Label>
                    <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>السبب</Label>
                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: غياب بدون عذر" />
                  </div>
                  <div className="space-y-2">
                    <Label>التاريخ</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <Button onClick={handleCreateDeduction} disabled={createDeduction.isPending || !employeeId || !amount || !reason} className="w-full bg-destructive hover:bg-destructive/90">
                    حفظ الخصم
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {(!deductions || deductions.length === 0) ? (
              <EmptyState 
                icon={ArrowDownRight}
                title="لا يوجد خصومات" 
                description="لم يتم تسجيل أي خصومات في هذا الفرع."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الموظف</TableHead>
                      <TableHead>السبب</TableHead>
                      <TableHead>القيمة</TableHead>
                      <TableHead className="text-right">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductions.map((deduction) => (
                      <TableRow key={deduction.id}>
                        <TableCell>{formatDate(deduction.date)}</TableCell>
                        <TableCell className="font-bold">{deduction.employeeName}</TableCell>
                        <TableCell>{deduction.reason}</TableCell>
                        <TableCell className="font-bold text-destructive">-{formatCurrency(deduction.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => deleteDeduction.mutate({ id: deduction.id })}
                            disabled={deleteDeduction.isPending}
                          >
                            <Trash2 size={16} />
                          </Button>
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
