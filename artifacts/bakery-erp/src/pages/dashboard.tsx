import React from "react";
import { useGetDashboardSummary, useGetCurrentUser, UserRole } from "@workspace/api-client-react";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Users, UserCheck, UserX, UserMinus, Wallet, Clock, PackageSearch, AlertTriangle, Activity } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { FullScreenLoader, ErrorState } from "@/components/ui/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: user } = useGetCurrentUser();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;
  
  const { data: summary, isLoading, isError, refetch } = useGetDashboardSummary(
    { branchId },
    { query: { enabled: !!user, queryKey: ['dashboard-summary', branchId] } }
  );

  if (isLoading) return <FullScreenLoader />;
  if (isError || !summary) return <ErrorState onRetry={refetch} />;

  const lowStockItems = summary.lowStockItems ?? [];
  const recentActivity = summary.recentActivity ?? [];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="لوحة التحكم" 
        description={user?.role === UserRole.general_manager ? "نظرة عامة على جميع الفروع" : `نظرة عامة على ${user?.branchName || "الفرع"}`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي الموظفين" value={summary.totalEmployees ?? 0} icon={Users} />
        <StatCard title="حضور اليوم" value={summary.presentToday ?? 0} icon={UserCheck} trend="up" trendValue={`${Math.round(((summary.presentToday ?? 0) / (summary.totalEmployees || 1)) * 100)}%`} />
        <StatCard title="غياب اليوم" value={summary.absentToday ?? 0} icon={UserX} className={(summary.absentToday ?? 0) > 0 ? "border-destructive/30" : ""} />
        <StatCard title="إجازات اليوم" value={summary.onLeaveToday ?? 0} icon={UserMinus} />
        
        <StatCard title="الرواتب المتراكمة" value={formatCurrency(summary.currentPayrollTotal ?? 0)} icon={Wallet} className="lg:col-span-2" />
        <StatCard title="تكلفة الإضافي" value={formatCurrency(summary.currentOvertimeTotal ?? 0)} icon={Clock} />
        <StatCard title="عناصر مستودع" value={summary.warehouseItemsCount ?? 0} icon={PackageSearch} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <AlertTriangle className="text-amber-500 w-5 h-5" />
                تنبيهات المخزون
              </CardTitle>
              <p className="text-sm text-muted-foreground">مواد قريبة من النفاد</p>
            </div>
            <Badge variant="destructive" className="bg-amber-500">{lowStockItems.length} صنف</Badge>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                <PackageSearch className="w-12 h-12 mb-3 opacity-20" />
                <p>مخزون جميع المواد ضمن الحد الآمن</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockItems.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div>
                      <h4 className="font-medium">{item.name} <span className="text-xs text-muted-foreground">({item.code})</span></h4>
                      <p className="text-sm text-muted-foreground">{item.branchName}</p>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-amber-600">{item.quantity} {item.unit}</div>
                      <div className="text-xs text-muted-foreground">الحد الأدنى: {item.minQuantity}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <Activity className="text-primary w-5 h-5" />
                أحدث العمليات
              </CardTitle>
              <p className="text-sm text-muted-foreground">آخر الأنشطة في النظام</p>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا يوجد نشاطات مسجلة بعد</p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent pr-4">
                {recentActivity.map(log => (
                  <div key={log.id} className="relative flex items-center justify-between p-3 bg-card border border-border rounded-lg shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {log.userName?.charAt(0) || "م"}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{log.action}</p>
                        <p className="text-xs text-muted-foreground flex gap-2">
                          <span>{log.userName}</span>
                          <span>&bull;</span>
                          <span>{log.branchName}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap text-left" dir="ltr">
                      {formatDateTime(log.date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
