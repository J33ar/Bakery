import React from "react";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListUsers, 
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useGetCurrentUser, 
  UserRole,
  useListBranches
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { UserCog, Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Users() {
  const { data: currentUser } = useGetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [role, setRole] = React.useState<UserRole>(UserRole.branch_manager);
  const [branchId, setBranchId] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editId, setEditId] = React.useState(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);

  const { data: users, isLoading, isError, refetch } = useListUsers(
    {},
    { query: { enabled: currentUser?.role === UserRole.general_manager, queryKey: ['users'] } }
  );

  const { data: branches } = useListBranches({
    query: { enabled: currentUser?.role === UserRole.general_manager, queryKey: ['branches'] }
  });

  const createUser = useCreateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الإضافة", description: "تم إنشاء المستخدم بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        setIsOpen(false);
        resetForm();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل إنشاء المستخدم" });
      }
    }
  });

  const deleteUser = useDeleteUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم حذف المستخدم بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['users'] });
      }
    }
  });

  const resetForm = () => {
    setEditId(null);
    setActive(true);
    setUsername("");
    setPassword("");
    setFullName("");
    setRole(UserRole.branch_manager);
    setBranchId("");
  };

  const updateUser = useUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم التعديل", description: "تم تعديل المستخدم بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['users'] });
        setIsEditOpen(false);
        resetForm();
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "خطأ", description: err.message || "فشل تعديل المستخدم" });
      }
    }
  });

  const openEdit = (u: any) => {
    setEditId(u.id);
    setUsername(u.username);
    setPassword("");
    setFullName(u.fullName);
    setRole(u.role);
    setBranchId(u.branchId ? u.branchId.toString() : "");
    setActive(u.active);
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editId) return;
    if (!fullName.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال الاسم الكامل" });
      return;
    }
    if (!username.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال اسم المستخدم" });
      return;
    }
    if (password && password.length < 4) {
      toast({ variant: "destructive", title: "كلمة مرور قصيرة", description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
      return;
    }
    if (role === UserRole.branch_manager && !branchId) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى اختيار الفرع لمدير الفرع" });
      return;
    }
    const data: Record<string, any> = {
      username,
      fullName,
      role,
      branchId: role === UserRole.branch_manager && branchId ? branchId : null,
      active
    };
    if (password) data.password = password;
    updateUser.mutate({ id: editId, data: data as any });
  };

  const handleCreate = () => {
    if (!fullName.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال الاسم الكامل" });
      return;
    }
    if (!username.trim()) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال اسم المستخدم (للدخول)" });
      return;
    }
    if (!password) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى إدخال كلمة المرور" });
      return;
    }
    if (password.length < 4) {
      toast({ variant: "destructive", title: "كلمة مرور قصيرة", description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
      return;
    }
    if (role === UserRole.branch_manager && !branchId) {
      toast({ variant: "destructive", title: "حقل مطلوب", description: "يرجى اختيار الفرع لمدير الفرع" });
      return;
    }
    createUser.mutate({
      data: {
        username,
        password,
        fullName,
        role,
        branchId: role === UserRole.branch_manager && branchId ? branchId : null,
        active: true
      }
    });
  };

  // Only GM can access this page
  if (currentUser && currentUser.role !== UserRole.general_manager) {
    return <Redirect to="/dashboard" />;
  }

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="إدارة المستخدمين" 
        description="إضافة وتعديل صلاحيات مدراء النظام والفروع"
        actions={
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary">
                <Plus size={16} /> مستخدم جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: أحمد محمد" />
                </div>
                <div className="space-y-2">
                  <Label>اسم المستخدم (لتسجيل الدخول)</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" className="text-right" placeholder="ahmad" />
                </div>
                <div className="space-y-2">
                  <Label>كلمة المرور</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="text-right" />
                </div>
                <div className="space-y-2">
                  <Label>الصلاحية</Label>
                  <Select value={role} onValueChange={(v: UserRole) => setRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.branch_manager}>مدير فرع</SelectItem>
                      <SelectItem value={UserRole.general_manager}>مدير عام (صلاحيات كاملة)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {role === UserRole.branch_manager && (
                  <div className="space-y-2">
                    <Label>الفرع</Label>
                    <Select value={branchId} onValueChange={setBranchId}>
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
                <Button onClick={handleCreate} disabled={createUser.isPending || !username || !password || !fullName || (role === UserRole.branch_manager && !branchId)} className="w-full">
                  إنشاء الحساب
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* نافذة تعديل المستخدم */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if(!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="مثال: أحمد محمد" />
            </div>
            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" className="text-right" placeholder="ahmad" />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور (اتركه فارغاً لعدم التغيير)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" className="text-right" />
            </div>
            <div className="space-y-2">
              <Label>الصلاحية</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.branch_manager}>مدير فرع</SelectItem>
                  <SelectItem value={UserRole.general_manager}>مدير عام (صلاحيات كاملة)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role === UserRole.branch_manager && (
              <div className="space-y-2">
                <Label>الفرع</Label>
                <Select value={branchId} onValueChange={setBranchId}>
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
            <div className="flex items-center gap-2">
              <input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <Label htmlFor="active">نشط</Label>
            </div>
            <Button onClick={handleUpdate} disabled={updateUser.isPending || !username || !fullName || (role === UserRole.branch_manager && !branchId)} className="w-full">
              حفظ التعديلات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المستخدم <strong>"{deleteTarget?.name}"</strong>؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteUser.mutate({ id: deleteTarget.id });
                  setDeleteTarget(null);
                }
              }}
            >
              نعم، احذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {(!users || users.length === 0) ? (
          <EmptyState 
            icon={UserCog}
            title="لا يوجد مستخدمين" 
            description="لم يتم العثور على أي مستخدمين في النظام."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>الاسم الكامل</TableHead>
                  <TableHead>اسم المستخدم</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الفرع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-right">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-bold">{u.fullName}</TableCell>
                    <TableCell className="font-mono text-sm">{u.username}</TableCell>
                    <TableCell>
                      {u.role === UserRole.general_manager ? (
                        <Badge className="bg-primary hover:bg-primary">مدير عام</Badge>
                      ) : (
                        <Badge variant="outline">مدير فرع</Badge>
                      )}
                    </TableCell>
                    <TableCell>{u.branchName || "كل الفروع"}</TableCell>
                    <TableCell>
                      {u.active ? <Badge className="bg-green-500">نشط</Badge> : <Badge variant="destructive">معطل</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:bg-primary/10"
                        onClick={() => openEdit(u)}
                      >
                        <Edit size={16} />
                      </Button>
                      {u.id !== currentUser?.id && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget({ id: u.id, name: u.fullName })}
                          disabled={deleteUser.isPending}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
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
