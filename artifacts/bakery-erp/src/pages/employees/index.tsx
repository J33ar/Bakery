import React from "react";
import { Link } from "wouter";
import { useListEmployees, useGetCurrentUser, UserRole, EmployeeStatus, ContractType, useDeleteEmployee } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/format";
import { Search, Plus, Eye, Edit, Trash2, Filter, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EmployeesList() {
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;
  
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: employees, isLoading, isError, refetch } = useListEmployees(
    { 
      branchId, 
      search: debouncedSearch || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined
    },
    { query: { enabled: !!user, queryKey: ['employees', branchId, debouncedSearch, statusFilter] } }
  );

  const deleteMutation = useDeleteEmployee({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف بنجاح", description: "تم حذف الموظف من النظام" });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        setDeleteId(null);
      },
      onError: () => {
        toast({ variant: "destructive", title: "خطأ", description: "فشل حذف الموظف. قد يكون مرتبطاً ببيانات أخرى." });
        setDeleteId(null);
      }
    }
  });

  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case EmployeeStatus.active: return <Badge className="bg-green-500 hover:bg-green-600">نشط</Badge>;
      case EmployeeStatus.suspended: return <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/30">موقوف</Badge>;
      case EmployeeStatus.resigned: return <Badge variant="outline" className="text-muted-foreground">مستقيل</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getContractBadge = (type: ContractType) => {
    switch (type) {
      case ContractType.full_time: return <Badge variant="outline" className="border-primary/30 text-primary">دوام كامل</Badge>;
      case ContractType.part_time: return <Badge variant="outline" className="border-blue-500/30 text-blue-600">دوام جزئي</Badge>;
      case ContractType.temporary: return <Badge variant="outline" className="border-orange-500/30 text-orange-600">مؤقت</Badge>;
      default: return null;
    }
  };

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="إدارة الموظفين" 
        description="سجل جميع العاملين في الفروع"
        actions={
          <Link href="/employees/new">
            <Button className="gap-2">
              <Plus size={16} />
              إضافة موظف
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="بحث بالاسم، الرقم الوظيفي، أو القسم..." 
            className="pl-4 pr-10 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48 flex items-center gap-2">
          <Filter className="text-muted-foreground w-4 h-4 shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="حالة الموظف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value={EmployeeStatus.active}>نشط</SelectItem>
              <SelectItem value={EmployeeStatus.suspended}>موقوف</SelectItem>
              <SelectItem value={EmployeeStatus.resigned}>مستقيل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {(!employees || employees.length === 0) ? (
          <EmptyState 
            icon={Users}
            title="لا يوجد موظفين" 
            description="لم يتم العثور على موظفين يطابقون معايير البحث."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[250px]">الموظف</TableHead>
                  <TableHead>الرقم الوظيفي</TableHead>
                  <TableHead>الفرع / القسم</TableHead>
                  <TableHead>تاريخ التعيين</TableHead>
                  <TableHead>الراتب الأساسي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-muted/30 transition-colors group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-primary/10">
                          {employee.photoUrl && <AvatarImage src={employee.photoUrl} alt={employee.fullName} />}
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">
                            {employee.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{employee.fullName}</p>
                          <p className="text-xs text-muted-foreground">{employee.jobTitle}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{employee.employeeNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm">{employee.branchName}</span>
                        <span className="text-xs text-muted-foreground">{employee.department}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(employee.hireDate)}</TableCell>
                    <TableCell className="font-bold text-primary/80">{formatCurrency(employee.baseSalary)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(employee.status)}
                        {getContractBadge(employee.contractType)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/employees/${employee.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="عرض السجل">
                            <Eye size={16} />
                          </Button>
                        </Link>
                        <Link href={`/employees/${employee.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" title="تعديل">
                            <Edit size={16} />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
                          title="حذف"
                          onClick={() => setDeleteId(employee.id)}
                        >
                          <Trash2 size={16} />
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف الموظف؟</AlertDialogTitle>
            <AlertDialogDescription>
              هذا الإجراء لا يمكن التراجع عنه. قد لا تتمكن من الحذف إذا كان للموظف سجلات رواتب أو حضور مرتبطة به (يُنصح بتغيير حالة الموظف إلى "مستقيل" بدلاً من حذفه).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف الموظف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
