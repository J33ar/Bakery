import React from "react";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { data: user, isLoading } = useGetCurrentUser();
  const { toast } = useToast();

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !user) return;

    if (password.length < 4) {
      toast({ variant: "destructive", title: "كلمة مرور قصيرة", description: "يجب أن تكون كلمة المرور 4 أحرف على الأقل" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "كلمات المرور غير متطابقة", description: "تأكد من تطابق كلمة المرور في الحقلين" });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "خطأ", description: data.error || "فشل تغيير كلمة المرور" });
      } else {
        toast({ title: "تم التحديث", description: "تم تغيير كلمة المرور بنجاح" });
        setPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "تعذّر الاتصال بالسيرفر" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) return <FullScreenLoader />;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">
      <PageHeader
        title="إعدادات الحساب"
        description="إدارة معلومات الدخول الخاصة بك"
      />

      <Card>
        <CardHeader>
          <CardTitle>المعلومات الشخصية</CardTitle>
          <CardDescription>معلومات حسابك لا يمكن تعديلها إلا من قبل المدير العام.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input value={user.fullName} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>اسم المستخدم</Label>
              <Input value={user.username} disabled className="bg-muted" dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>الصلاحية</Label>
              <Input value={user.role === 'general_manager' ? 'مدير عام' : 'مدير فرع'} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>الفرع</Label>
              <Input value={user.branchName || 'كل الفروع'} disabled className="bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تغيير كلمة المرور</CardTitle>
          <CardDescription>يجب أن تتكون كلمة المرور من 4 أحرف أو أرقام على الأقل.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2 max-w-sm">
              <Label>كلمة المرور الجديدة</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="text-right"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2 max-w-sm">
              <Label>تأكيد كلمة المرور</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
                className={`text-right ${confirmPassword && confirmPassword !== password ? 'border-destructive' : ''}`}
                placeholder="••••••••"
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-destructive">كلمتا المرور غير متطابقتين</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSaving || password.length < 4 || password !== confirmPassword}
              className="bg-primary"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
