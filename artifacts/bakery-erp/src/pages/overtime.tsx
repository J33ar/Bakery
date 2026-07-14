import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListOvertimeRates,
  useCreateOvertimeRate,
  useDeleteOvertimeRate,
  useUpdateOvertimeRate,
  useGetCurrentUser, 
  UserRole,
  useListBranches,
  type OvertimeRate,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { FileClock, Plus, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Overtime() {
  const { data: user } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;
  
  // حالة إنشاء تسعيرة جديدة
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedBranchId, setSelectedBranchId] = React.useState(branchId?.toString() || "");
  const [ratePerHour, setRatePerHour] = React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState(format(new Date(), 'yyyy-MM-dd'));
  const [effectiveTo, setEffectiveTo] = React.useState("");

  // حالة تعديل تسعيرة
  const [editingRate, setEditingRate] = React.useState<OvertimeRate | null>(null);
  const [editRatePerHour, setEditRatePerHour] = React.useState("");
  const [editEffectiveFrom, setEditEffectiveFrom] = React.useState("");
  const [editEffectiveTo, setEditEffectiveTo] = React.useState("");

  const { data: rates, isLoading, isError, refetch } = useListOvertimeRates(
    { branchId },
    { query: { enabled: !!user, queryKey: ['overtime-rates', branchId] } }
  );

  const { data: branches } = useListBranches({
    query: { enabled: user?.role === UserRole.general_manager, queryKey: ['branches'] }
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['overtime-rates'] });

  const createRate = useCreateOvertimeRate({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الإضافة", description: "تم إضافة التسعيرة بنجاح" });
        invalidate();
        setIsCreateOpen(false);
        setRatePerHour("");
        setEffectiveTo("");
      },
      onError: () => toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء الإضافة" })
    }
  });

  const updateRate = useUpdateOvertimeRate({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم التعديل", description: "تم تعديل التسعيرة بنجاح" });
        invalidate();
        setEditingRate(null);
      },
      onError: () => toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء التعديل" })
    }
  });

  const deleteRate = useDeleteOvertimeRate({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم حذف التسعيرة بنجاح" });
        invalidate();
      },
      onError: () => toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ أثناء الحذف" })
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
        effectiveFrom,
        effectiveTo: effectiveTo || null,
      }
    });
  };

  const openEdit = (rate: OvertimeRate) => {
    setEditingRate(rate);
    setEditRatePerHour(String(rate.ratePerHour));
    setEditEffectiveFrom(rate.effectiveFrom);
    setEditEffectiveTo(rate.effectiveTo ?? "");
  };

  const handleEdit = () => {
    if (!editingRate) return;
    if (!editRatePerHour || parseFloat(editRatePerHour) <= 0) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال سعر الساعة (أكبر من صفر)" });
      return;
    }
    updateRate.mutate({
      id: editingRate.id,
      data: {
        ratePerHour: parseFloat(editRatePerHour),
        effectiveFrom: editEffectiveFrom,
        effectiveTo: editEffectiveTo || null,
      }
    });
  };

  // تحديد ما إذا كانت التسعيرة سارية الآن
  const today = format(new Date(), 'yyyy-MM-dd');
  const isActive = (rate: OvertimeRate) =>
    rate.effectiveFrom <= today && (!rate.effectiveTo || rate.effectiveTo >= today);

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="إعدادات الإضافي" 
        description="تحديد سعر ساعة العمل الإضافي لكل فرع"
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                  <Label>تاريخ البداية</Label>
                  <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الانتهاء <span className="text-muted-foreground text-xs">(اختياري — اتركه فارغاً إذا مفتوحة)</span></Label>
                  <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} min={effectiveFrom} />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={createRate.isPending || !selectedBranchId || !ratePerHour}
                  className="w-full"
                >
                  {createRate.isPending ? "جاري الحفظ..." : "حفظ التسعيرة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* نافذة التعديل */}
      <Dialog open={!!editingRate} onOpenChange={(open) => !open && setEditingRate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل التسعيرة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>سعر الساعة (دينار)</Label>
              <Input type="number" step="0.05" value={editRatePerHour} onChange={(e) => setEditRatePerHour(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>تاريخ البداية</Label>
              <Input type="date" value={editEffectiveFrom} onChange={(e) => setEditEffectiveFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>تاريخ الانتهاء <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
              <Input type="date" value={editEffectiveTo} onChange={(e) => setEditEffectiveTo(e.target.value)} min={editEffectiveFrom} />
              {editEffectiveTo && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setEditEffectiveTo("")}
                >
                  مسح تاريخ الانتهاء
                </button>
              )}
            </div>
            <Button onClick={handleEdit} disabled={updateRate.isPending} className="w-full">
              {updateRate.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  <TableHead>سعر الساعة</TableHead>
                  <TableHead>تاريخ البداية</TableHead>
                  <TableHead>تاريخ الانتهاء</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-20">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id} className={isActive(rate) ? "bg-primary/5 border-b-2 border-primary/20" : ""}>
                    <TableCell className="font-bold">
                      {user?.role === UserRole.general_manager 
                        ? branches?.find(b => b.id === rate.branchId)?.name ?? rate.branchId
                        : user?.branchName}
                    </TableCell>
                    <TableCell className="font-bold text-lg">{formatCurrency(rate.ratePerHour)}</TableCell>
                    <TableCell>{formatDate(rate.effectiveFrom)}</TableCell>
                    <TableCell>
                      {rate.effectiveTo ? formatDate(rate.effectiveTo) : (
                        <span className="text-muted-foreground text-xs">مفتوحة</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isActive(rate) ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">سارية</Badge>
                      ) : rate.effectiveFrom > today ? (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">قادمة</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">منتهية</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:bg-primary/10"
                          onClick={() => openEdit(rate)}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={deleteRate.isPending}
                          onClick={() => deleteRate.mutate({ id: rate.id })}
                        >
                          <Trash2 size={15} />
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
    </div>
  );
}
