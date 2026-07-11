import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListOvertimeRates,
  useCreateOvertimeRate,
  useDeleteOvertimeRate,
  useGetCurrentUser, 
  UserRole,
  useListBranches
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { FileClock, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function Overtime() {
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedBranchId, setSelectedBranchId] = React.useState(branchId?.toString() || "");
  const [ratePerHour, setRatePerHour] = React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  
  const { data: rates, isLoading, isError, refetch } = useListOvertimeRates(
    { branchId },
    { query: { enabled: !!user, queryKey: ['overtime-rates', branchId] } }
  );

  const { data: branches } = useListBranches({
    query: { enabled: user?.role === UserRole.general_manager, queryKey: ['branches'] }
  });

  const createRate = useCreateOvertimeRate({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الإضافة", description: "تم تحديث تسعيرة الإضافي بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['overtime-rates'] });
        setIsOpen(false);
        setRatePerHour("");
      }
    }
  });

  const deleteRate = useDeleteOvertimeRate({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم حذف التسعيرة بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['overtime-rates'] });
      },
      onError: () => {
        toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء الحذف" });
      }
    }
  });

  const handleCreate = () => {
    const finalBranchId = user?.role === UserRole.general_manager ? selectedBranchId : user?.branchId?.toString();
    if (!finalBranchId) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى اختيار الفرع" });
      return;
    }
    if (!ratePerHour || parseFloat(ratePerHour) <= 0) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال سعر الساعة (أكبر من صفر)" });
      return;
    }
    if (!effectiveFrom) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى تحديد تاريخ سريان التسعيرة" });
      return;
    }
    createRate.mutate({
      data: {
        branchId: finalBranchId,
        ratePerHour: parseFloat(ratePerHour),
        effectiveFrom
      }
    });
  };

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="إعدادات الإضافي" 
        description="تحديد سعر ساعة العمل الإضافي"
        actions={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary">
                <Plus size={16} /> تسعيرة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تسعيرة جديدة للإضافي</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {user?.role === UserRole.general_manager && (
                  <div className="space-y-2">
                    <Label>الفرع</Label>
                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفرع" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches?.map(b => (
                          <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>سعر الساعة (دينار)</Label>
                  <Input type="number" step="0.05" value={ratePerHour} onChange={(e) => setRatePerHour(e.target.value)} placeholder="مثال: 1.50" />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ السريان</Label>
                  <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                </div>
                <Button onClick={handleCreate} disabled={createRate.isPending || !selectedBranchId || !ratePerHour} className="w-full">
                  حفظ التسعيرة
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {(!rates || rates.length === 0) ? (
          <EmptyState 
            icon={FileClock}
            title="لا يوجد تسعيرة" 
            description="يرجى إضافة تسعيرة لساعة العمل الإضافي ليتم حسابها في الرواتب."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>الفرع</TableHead>
                  <TableHead>تاريخ السريان</TableHead>
                  <TableHead>سعر الساعة</TableHead>
                  <TableHead className="w-16">حذف</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate, index) => (
                  <TableRow key={rate.id} className={index === 0 ? "bg-primary/5 border-b-2 border-primary/20" : ""}>
                    <TableCell className="font-bold">
                      {user?.role === UserRole.general_manager 
                        ? branches?.find(b => b.id === rate.branchId)?.name 
                        : user?.branchName}
                    </TableCell>
                    <TableCell>
                      {formatDate(rate.effectiveFrom)}
                      {index === 0 && <span className="ml-2 text-xs text-primary font-bold">(التسعيرة الحالية)</span>}
                    </TableCell>
                    <TableCell className="font-bold text-lg">{formatCurrency(rate.ratePerHour)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={deleteRate.isPending}
                        onClick={() => deleteRate.mutate({ id: rate.id })}
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
    </div>
  );
}
