import React from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListWarehouseItems,
  useListWarehouseMovements,
  useGetCurrentUser, 
  UserRole
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  useCreateWarehouseItem, 
  useUpdateWarehouseItem, 
  useDeleteWarehouseItem, 
  useCreateWarehouseMovement, 
  useListBranches 
} from "@workspace/api-client-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageSearch, Search, Plus, ArrowDownRight, ArrowUpRight, AlertTriangle, ListFilter } from "lucide-react";

export default function Warehouse() {
  const { data: user } = useGetCurrentUser();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;
  
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Create Dialog
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [cForm, setCForm] = React.useState({ name: "", code: "", category: "", unit: "", quantity: "", minQuantity: "", supplier: "", purchasePrice: "", notes: "", branchId: "" });
  
  // Movement Dialog
  const [isMoveOpen, setIsMoveOpen] = React.useState(false);
  const [moveItem, setMoveItem] = React.useState<any>(null);
  const [mForm, setMForm] = React.useState({ type: "in", quantity: "", reason: "", notes: "" });

  // Edit Dialog
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<any>(null);

  // Delete Dialog
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const { data: branches } = useListBranches({ query: { enabled: user?.role === UserRole.general_manager, queryKey: ['branches'] } });

  const createItem = useCreateWarehouseItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم", description: "تم إضافة الصنف بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
        setIsCreateOpen(false);
      },
      onError: (e: any) => toast({ variant: "destructive", title: "خطأ", description: e.message })
    }
  });

  const updateItem = useUpdateWarehouseItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم", description: "تم تعديل الصنف" });
        queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
        setIsEditOpen(false);
      },
      onError: (e: any) => toast({ variant: "destructive", title: "خطأ", description: e.message })
    }
  });

  const deleteItem = useDeleteWarehouseItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم", description: "تم حذف الصنف" });
        queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
        setDeleteId(null);
      },
      onError: (e: any) => toast({ variant: "destructive", title: "خطأ", description: e.message })
    }
  });

  const createMovement = useCreateWarehouseMovement({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم", description: "تم تسجيل الحركة" });
        queryClient.invalidateQueries({ queryKey: ['warehouse-items'] });
        queryClient.invalidateQueries({ queryKey: ['warehouse-movements'] });
        setIsMoveOpen(false);
      },
      onError: (e: any) => toast({ variant: "destructive", title: "خطأ", description: e.message })
    }
  });

  const handleCreate = () => {
    const finalBranchId = user?.role === UserRole.general_manager ? cForm.branchId : user?.branchId;
    if (!finalBranchId) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى اختيار الفرع" });
      return;
    }
    if (!cForm.name.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال اسم الصنف" });
      return;
    }
    if (!cForm.code.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال رمز الصنف" });
      return;
    }
    if (!cForm.category.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال تصنيف الصنف" });
      return;
    }
    if (!cForm.unit.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال وحدة القياس (كغ، لتر، حبة...)" });
      return;
    }
    if (!cForm.minQuantity || parseFloat(cForm.minQuantity) < 0) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال الحد الأدنى للمخزون" });
      return;
    }
    createItem.mutate({
      data: {
        ...cForm,
        quantity: parseFloat(cForm.quantity || "0"),
        minQuantity: parseFloat(cForm.minQuantity || "0"),
        purchasePrice: cForm.purchasePrice ? parseFloat(cForm.purchasePrice) : undefined,
        branchId: finalBranchId
      }
    });
  };

  const handleUpdate = () => {
    if (!editItem) return;
    if (!cForm.name.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال اسم الصنف" });
      return;
    }
    if (!cForm.code.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال رمز الصنف" });
      return;
    }
    if (!cForm.category.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال تصنيف الصنف" });
      return;
    }
    if (!cForm.unit.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال وحدة القياس" });
      return;
    }
    updateItem.mutate({
      id: editItem.id,
      data: {
        name: cForm.name,
        code: cForm.code,
        category: cForm.category,
        unit: cForm.unit,
        minQuantity: parseFloat(cForm.minQuantity || "0"),
        supplier: cForm.supplier || undefined,
        purchasePrice: cForm.purchasePrice ? parseFloat(cForm.purchasePrice) : undefined,
        notes: cForm.notes || undefined
      }
    });
  };

  const handleMovement = () => {
    if (!moveItem) return;
    if (!mForm.quantity || parseFloat(mForm.quantity) <= 0) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال كمية صحيحة أكبر من صفر" });
      return;
    }
    if (mForm.type === "out" && parseFloat(mForm.quantity) > moveItem.quantity) {
      toast({ variant: "destructive", title: "كمية غير كافية", description: `الكمية المتوفرة هي ${moveItem.quantity} ${moveItem.unit} فقط` });
      return;
    }
    createMovement.mutate({
      data: {
        itemId: moveItem.id,
        type: mForm.type as any,
        quantity: parseFloat(mForm.quantity),
        reason: mForm.reason || undefined,
        notes: mForm.notes || undefined
      }
    });
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setCForm({
      name: item.name, code: item.code, category: item.category, unit: item.unit,
      quantity: item.quantity.toString(), minQuantity: item.minQuantity.toString(),
      supplier: item.supplier || "", purchasePrice: item.purchasePrice?.toString() || "",
      notes: item.notes || "", branchId: item.branchId.toString()
    });
    setIsEditOpen(true);
  };

  
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);
  
  const { data: items, isLoading, isError, refetch } = useListWarehouseItems(
    { branchId, search: debouncedSearch || undefined },
    { query: { enabled: !!user, queryKey: ['warehouse-items', branchId, debouncedSearch] } }
  );

  const { data: movements } = useListWarehouseMovements(
    { branchId },
    { query: { enabled: !!user, queryKey: ['warehouse-movements', branchId] } }
  );

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <ErrorState onRetry={refetch} />;

  // Get unique categories
  const categories = Array.from(new Set(items?.map(i => i.category) || []));
  
  const filteredItems = items?.filter(i => categoryFilter === "all" || i.category === categoryFilter);

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="المستودع والمخزون" 
        description="إدارة المواد الخام والأصناف"
        actions={
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary" onClick={() => setCForm({name:"", code:"", category:"", unit:"", quantity:"", minQuantity:"", supplier:"", purchasePrice:"", notes:"", branchId:""})}>
            <Plus size={16} />
            إضافة صنف جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>إضافة صنف جديد</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label>الاسم</Label><Input value={cForm.name} onChange={e=>setCForm({...cForm, name: e.target.value})} /></div>
                <div className="space-y-2"><Label>الرمز</Label><Input value={cForm.code} onChange={e=>setCForm({...cForm, code: e.target.value})} dir="ltr" className="text-right" /></div>
                <div className="space-y-2"><Label>التصنيف</Label><Input value={cForm.category} onChange={e=>setCForm({...cForm, category: e.target.value})} /></div>
                <div className="space-y-2"><Label>الوحدة</Label><Input value={cForm.unit} onChange={e=>setCForm({...cForm, unit: e.target.value})} placeholder="كغ، لتر، حبة..." /></div>
                <div className="space-y-2"><Label>الكمية الافتتاحية</Label><Input type="number" value={cForm.quantity} onChange={e=>setCForm({...cForm, quantity: e.target.value})} /></div>
                <div className="space-y-2"><Label>الحد الأدنى</Label><Input type="number" value={cForm.minQuantity} onChange={e=>setCForm({...cForm, minQuantity: e.target.value})} /></div>
                <div className="space-y-2"><Label>المورد (اختياري)</Label><Input value={cForm.supplier} onChange={e=>setCForm({...cForm, supplier: e.target.value})} /></div>
                <div className="space-y-2"><Label>سعر الشراء (اختياري)</Label><Input type="number" value={cForm.purchasePrice} onChange={e=>setCForm({...cForm, purchasePrice: e.target.value})} /></div>
                {user?.role === UserRole.general_manager && (
                  <div className="space-y-2"><Label>الفرع</Label>
                    <Select value={cForm.branchId} onValueChange={v=>setCForm({...cForm, branchId: v})}>
                      <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                      <SelectContent>
                        {branches?.map(b => <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={createItem.isPending}>حفظ الصنف</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="bg-card border border-border h-12 w-full justify-start overflow-x-auto">
          <TabsTrigger value="inventory" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px]">المخزون الحالي</TabsTrigger>
          <TabsTrigger value="movements" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground min-w-[120px]">حركة المستودع</TabsTrigger>
          <TabsTrigger value="low-stock" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground min-w-[120px] flex items-center gap-2">
            <AlertTriangle size={14} /> نواقص المستودع
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="inventory" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="بحث عن صنف..." 
                className="pl-4 pr-10 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-64 flex items-center gap-2">
              <ListFilter className="text-muted-foreground w-4 h-4 shrink-0" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التصنيفات</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {(!filteredItems || filteredItems.length === 0) ? (
              <EmptyState 
                icon={PackageSearch}
                title="لا يوجد أصناف" 
                description="لم يتم العثور على أصناف تطابق معايير البحث."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>رمز الصنف</TableHead>
                      <TableHead className="w-[300px]">الاسم</TableHead>
                      <TableHead>التصنيف</TableHead>
                      <TableHead>الكمية المتوفرة</TableHead>
                      <TableHead>الفرع</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-right">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.code}</TableCell>
                        <TableCell className="font-bold">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center">
                            <span className={`text-lg font-bold leading-tight ${item.quantity <= item.minQuantity ? 'text-destructive' : 'text-foreground'}`}>
                              {item.quantity}
                            </span>
                            <span className="text-xs text-muted-foreground">{item.unit}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.branchName ?? "—"}</TableCell>
                        <TableCell>
                          {item.quantity <= 0 ? (
                            <Badge variant="destructive">نفد الكمية</Badge>
                          ) : item.quantity <= item.minQuantity ? (
                            <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">قارب على النفاد</Badge>
                          ) : (
                            <Badge className="bg-green-500">متوفر</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary border border-primary/20 hover:bg-primary/10 text-xs py-0 h-8"
                            onClick={() => { setMoveItem(item); setMForm({type:"in", quantity:"", reason:"", notes:""}); setIsMoveOpen(true); }}
                          >
                            حركة مخزون
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => openEdit(item)}>
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(item.id)}>
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
        
        {/* Movements Tab Content */}
        <TabsContent value="movements" className="mt-6">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {(!movements || movements.length === 0) ? (
              <EmptyState 
                icon={PackageSearch}
                title="لا يوجد حركات" 
                description="لم يتم تسجيل أي حركة في المستودع بعد."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الصنف</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>السبب</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap" dir="ltr">{new Date(m.date).toLocaleString('ar-JO')}</TableCell>
                        <TableCell className="font-bold">{m.itemName}</TableCell>
                        <TableCell>
                          {m.type === 'in' ? (
                            <Badge className="bg-green-500 inline-flex items-center gap-1"><ArrowDownRight size={14}/> إدخال</Badge>
                          ) : m.type === 'out' ? (
                            <Badge variant="destructive" className="inline-flex items-center gap-1"><ArrowUpRight size={14}/> إخراج</Badge>
                          ) : (
                            <Badge variant="secondary">تسوية</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-bold font-mono" dir="ltr">
                          {m.type === 'in' ? '+' : m.type === 'out' ? '-' : ''}{m.quantity}
                        </TableCell>
                        <TableCell>{m.userName ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.reason || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="low-stock" className="mt-6">
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl shadow-sm overflow-hidden p-6">
            <h3 className="text-destructive font-bold text-lg mb-4 flex items-center gap-2">
              <AlertTriangle /> الأصناف التي تتطلب إعادة طلب
            </h3>
            
            {(!items || items.filter(i => i.quantity <= i.minQuantity).length === 0) ? (
              <p className="text-muted-foreground">جميع الأصناف متوفرة بكميات آمنة.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.filter(i => i.quantity <= i.minQuantity).map(item => (
                  <div key={item.id} className="bg-background border border-destructive/20 rounded-lg p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-lg">{item.name}</h4>
                        <Badge variant="outline" className="text-xs">{item.code}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">الفرع: {item.branchName}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">المتوفر</p>
                        <p className="font-bold text-destructive text-xl">{item.quantity} <span className="text-xs">{item.unit}</span></p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">الحد الأدنى</p>
                        <p className="font-bold text-foreground text-xl">{item.minQuantity} <span className="text-xs">{item.unit}</span></p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>تعديل الصنف</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>الاسم</Label><Input value={cForm.name} onChange={e=>setCForm({...cForm, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>الرمز</Label><Input value={cForm.code} onChange={e=>setCForm({...cForm, code: e.target.value})} dir="ltr" className="text-right" /></div>
            <div className="space-y-2"><Label>التصنيف</Label><Input value={cForm.category} onChange={e=>setCForm({...cForm, category: e.target.value})} /></div>
            <div className="space-y-2"><Label>الوحدة</Label><Input value={cForm.unit} onChange={e=>setCForm({...cForm, unit: e.target.value})} /></div>
            <div className="space-y-2"><Label>الحد الأدنى</Label><Input type="number" value={cForm.minQuantity} onChange={e=>setCForm({...cForm, minQuantity: e.target.value})} /></div>
            <div className="space-y-2"><Label>المورد (اختياري)</Label><Input value={cForm.supplier} onChange={e=>setCForm({...cForm, supplier: e.target.value})} /></div>
            <div className="space-y-2"><Label>سعر الشراء (اختياري)</Label><Input type="number" value={cForm.purchasePrice} onChange={e=>setCForm({...cForm, purchasePrice: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={updateItem.isPending}>حفظ التعديلات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>حركة مخزون: {moveItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>نوع الحركة</Label>
              <Select value={mForm.type} onValueChange={v=>setMForm({...mForm, type: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">إدخال (+)</SelectItem>
                  <SelectItem value="out">إخراج (-)</SelectItem>
                  <SelectItem value="adjustment">تسوية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>الكمية</Label><Input type="number" value={mForm.quantity} onChange={e=>setMForm({...mForm, quantity: e.target.value})} /></div>
            <div className="space-y-2"><Label>السبب</Label><Input value={mForm.reason} onChange={e=>setMForm({...mForm, reason: e.target.value})} /></div>
            <div className="space-y-2"><Label>ملاحظات</Label><Input value={mForm.notes} onChange={e=>setMForm({...mForm, notes: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleMovement} disabled={createMovement.isPending}>تأكيد الحركة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الصنف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الصنف من المستودع؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteItem.mutate({ id: deleteId })} className="bg-destructive text-destructive-foreground">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
