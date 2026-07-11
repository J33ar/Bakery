import React from "react";
import { useListAuditLogs, useGetCurrentUser, UserRole } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { FullScreenLoader, ErrorState, EmptyState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { History } from "lucide-react";

export default function AuditLog() {
  const { data: user } = useGetCurrentUser();
  const branchId = user?.role === UserRole.branch_manager ? user.branchId ?? undefined : undefined;
  
  const { data: logs, isLoading, isError, refetch } = useListAuditLogs(
    { branchId, limit: 100 },
    { query: { enabled: !!user, queryKey: ['audit-logs', branchId] } }
  );

  if (isLoading) return <FullScreenLoader />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="سجل العمليات (التدقيق)" 
        description="تتبع كل الإجراءات التي تمت على النظام"
      />

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {(!logs || logs.length === 0) ? (
          <EmptyState 
            icon={History}
            title="لا يوجد سجلات" 
            description="لم يتم تسجيل أي عمليات بعد."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>التاريخ والوقت</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الفرع</TableHead>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="whitespace-nowrap font-mono text-sm" dir="ltr">
                      {formatDateTime(log.date)}
                    </TableCell>
                    <TableCell className="font-bold">{log.userName || "النظام"}</TableCell>
                    <TableCell>{log.branchName || "كل الفروع"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary-foreground/10">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate" title={log.details || ""}>
                      {log.details || "-"}
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
