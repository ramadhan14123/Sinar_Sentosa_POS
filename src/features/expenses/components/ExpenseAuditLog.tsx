import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, XCircle, Trash2 } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { formatDateTime } from "@/shared/utils/format";
import { useExpenseAuditLogQuery } from "../queries/expense.queries";
import type { ExpenseAuditLog as AuditLogType } from "../services/expense.functions";
import { getExpenseAuditLog } from "../services/expense.functions";

const ACTION_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  submitted: { label: "Diajukan", icon: Clock, color: "text-yellow-600" },
  approved: { label: "Disetujui", icon: CheckCircle2, color: "text-success" },
  rejected: { label: "Ditolak", icon: XCircle, color: "text-destructive" },
  cleanup_moved: { label: "Dipindahkan ke Cold Storage", icon: Clock, color: "text-blue-500" },
  cleanup_deleted: { label: "File Struk Dihapus (Retensi)", icon: Trash2, color: "text-muted-foreground" },
};

type Props = {
  expenseId: string;
};

export function ExpenseAuditLog({ expenseId }: Props) {
  const getFn = useServerFn(getExpenseAuditLog);
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["expense-audit-log", expenseId],
    queryFn: () => getFn({ data: { expenseId } }),
    enabled: !!expenseId,
  });

  if (isLoading) {
    return (
      <div className="space-y-1.5 pt-1">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Riwayat Aktivitas
      </p>
      <ol className="relative border-l border-border/60 pl-4 space-y-3">
        {logs.map((log) => {
          const meta = ACTION_META[log.action] ?? {
            label: log.action,
            icon: Clock,
            color: "text-muted-foreground",
          };
          const Icon = meta.icon;
          return (
            <li key={log.id} className="relative">
              <span className="absolute -left-[1.4rem] flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
                <Icon className={cn("size-3", meta.color)} />
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className={cn("text-xs font-semibold", meta.color)}>{meta.label}</span>
                {log.actor?.full_name && (
                  <span className="text-xs text-muted-foreground">oleh {log.actor.full_name}</span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
              {log.notes && (
                <p className="mt-0.5 text-xs text-muted-foreground italic">{log.notes}</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
