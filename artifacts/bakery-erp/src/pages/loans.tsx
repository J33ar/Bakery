import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListLoans, 
  useCreateLoan,
  useUpdateLoan,
  useDeleteLoan,
  useGetCurrentUser, 
  UserRole,
  useListEmployees
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function Loans() {
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [installment, setInstallment] = React.useState("");
  const [date, setDate] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  
  const { data: loans, isLoading, isError, refetch } = useListLoans(
    { branchId },
    { query: { enabled: !!user, queryKey: ['loans', branchId] } }
  );

  const { data: employees } = useListEmployees(
    { branchId, status: "active" },
    { query: { enabled: !!user, queryKey: ['employees-active', branchId] } }
  );

  const createLoan = useCreateLoan({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الإضافة", description: "تم تسجيل السلفة بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['loans'] });
        setIsOpen(false);
        setEmployeeId("");
        setAmount("");
        setInstallment("");
      }
    }
  });

  const deleteLoan = useDeleteLoan({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم حذف السلفة بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['loans'] });
      }
    }
  });

  const handleCreate = () => {
    if (!employeeId) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى اختيار الموظف" });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال مبلغ السلفة (أكبر من صفر)" });
      return;
    }
    if (!installment || parseFloat(installment) <= 0) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال القسط الشهري (أكبر من صفر)" });
      return;
    }
    if (parseFloat(installment) > parseFloat(amount)) {
      toast({ variant: "destructive", title: "قيمة غير صحيحة", description: "القسط الشهري لا يمكن أن يكون أكبر من مبلغ السلفة" });
      return;
    }
    createLoan.mutate({ data: { employeeId, amount: parseFloat(amount), installment: parseFloat(installment), date } });
  };

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const activeLoans = loans?.filter(l => l.remaining > 0) || [];
  const completedLoans = loans?.filter(l => l.remaining <= 0) || [];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="السلف والأقساط" 
        description="إدارة السلف المقدمة للموظفين"
        actions={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary">
                <Plus size={16} /> إضافة سلفة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تسجيل سلفة لموظف</DialogTitle>
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
                  <Label>مبلغ السلفة الإجمالي</Label>
                  <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>القسط الشهري (يخصم تلقائياً من الراتب)</Label>
                  <Input type="number" step="0.01" value={installment} onChange={(e) => setInstallment(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>التاريخ</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <Button onClick={handleCreate} disabled={createLoan.isPending || !employeeId || !amount || !installment} className="w-full">
                  حفظ السلفة
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-border bg-card">
          <h3 className="font-bold text-lg">السلف النشطة</h3>
        </div>
        {activeLoans.length === 0 ? (
          <EmptyState 
            icon={CreditCard}
            title="لا يوجد سلف نشطة" 
            description="لا توجد أي سلف لم يتم سدادها بعد."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>القسط</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>التقدم</TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>{formatDate(loan.date)}</TableCell>
                    <TableCell className="font-bold">{loan.employeeName}</TableCell>
                    <TableCell className="font-bold text-primary">{formatCurrency(loan.amount)}</TableCell>
                    <TableCell>{formatCurrency(loan.installment)}/شهر</TableCell>
                    <TableCell className="text-destructive font-bold">{formatCurrency(loan.remaining)}</TableCell>
                    <TableCell className="w-[200px]">
                      <div className="flex flex-col gap-1">
                        <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all" 
                            style={{ width: `${((loan.amount - loan.remaining) / loan.amount) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-muted-foreground text-left" dir="ltr">
                          {Math.round(((loan.amount - loan.remaining) / loan.amount) * 100)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => deleteLoan.mutate({ id: loan.id })}
                        disabled={deleteLoan.isPending}
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
      
      {completedLoans.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden opacity-75">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="font-bold text-lg">السلف المسددة</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>الإجمالي</TableHead>
                  <TableHead>حالة السداد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>{formatDate(loan.date)}</TableCell>
                    <TableCell className="font-bold">{loan.employeeName}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(loan.amount)}</TableCell>
                    <TableCell className="text-green-600 font-bold">مكتمل</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
