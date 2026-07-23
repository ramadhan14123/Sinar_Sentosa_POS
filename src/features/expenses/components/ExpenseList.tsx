import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  ReceiptText,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/shared/utils/cn";
import { formatDateTime, formatIDR } from "@/shared/utils/format";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ExpenseAuditLog } from "./ExpenseAuditLog";
import { approveExpense, rejectExpense, getReceiptSignedUrl, type Expense } from "../services/expense.functions";

const STATUS_META: Record<string, { label: string; chip: string; icon: typeof Clock }> = {
  submitted: {
    label: "Menunggu",
    chip: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  approved: {
    label: "Disetujui",
    chip: "bg-success-soft text-success",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Ditolak",
    chip: "bg-destructive/10 text-destructive",
    icon: XCircle,
  },
  draft: {
    label: "Draft",
    chip: "bg-muted text-muted-foreground",
    icon: Clock,
  },
};

type Props = {
  expenses: Expense[];
  isLoading: boolean;
  isOwner?: boolean;
};

export function ExpenseList({ expenses, isLoading, isOwner = false }: Props) {
  const qc = useQueryClient();
  const approveFn = useServerFn(approveExpense);
  const rejectFn = useServerFn(rejectExpense);
  const signedUrlFn = useServerFn(getReceiptSignedUrl);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; expenseId: string; expenseCode: string }>({
    open: false,
    expenseId: "",
    expenseCode: "",
  });
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

  async function handleApprove(expenseId: string) {
    setProcessing(expenseId);
    try {
      await approveFn({ data: { expenseId } });
      toast.success("Pengeluaran disetujui.");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return toast.error("Alasan penolakan wajib diisi.");
    setProcessing(rejectDialog.expenseId);
    try {
      await rejectFn({ data: { expenseId: rejectDialog.expenseId, reason: rejectReason } });
      toast.success("Pengeluaran ditolak.");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setRejectDialog({ open: false, expenseId: "", expenseCode: "" });
      setRejectReason("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(null);
    }
  }

  async function openReceipt(storagePath: string) {
    setLoadingUrl(storagePath);
    try {
      const { url } = await signedUrlFn({ data: { storagePath } });
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Gagal membuka struk.");
    } finally {
      setLoadingUrl(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center">
        <ReceiptText className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Belum ada data pengeluaran.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="overflow-hidden rounded-2xl border">
        {expenses.map((exp, i) => {
          const meta = STATUS_META[exp.status] ?? STATUS_META.draft;
          const StatusIcon = meta.icon;
          const isExpanded = expandedId === exp.id;
          const activeReceipt = exp.receipts?.find((r) => r.storage_tier !== "deleted");

          return (
            <li key={exp.id} className={cn(i > 0 && "border-t")}>
              <div
                className="flex cursor-pointer items-center gap-4 px-4 py-3 transition hover:bg-muted/30 sm:px-5"
                onClick={() => setExpandedId(isExpanded ? null : exp.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-display font-extrabold tracking-tight">{exp.merchant}</span>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        meta.chip,
                      )}
                    >
                      <StatusIcon className="size-3" />
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{exp.category?.name}</span>
                    <span aria-hidden>•</span>
                    <span>{new Date(exp.receipt_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {exp.submitter && (
                      <>
                        <span aria-hidden>•</span>
                        <span>{exp.submitter.full_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-display font-extrabold text-primary">{formatIDR(exp.amount)}</span>
                  <ChevronDown
                    className={cn("size-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="space-y-3 px-4 pb-4 sm:px-5">
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-2 text-sm">
                    {exp.receipt_number && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">No. Struk</span>
                        <span className="font-mono">{exp.receipt_number}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Keterangan</span>
                      <span className="max-w-[60%] text-right">{exp.description}</span>
                    </div>
                    {exp.rejection_reason && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Alasan Ditolak</span>
                        <span className="max-w-[60%] text-right text-destructive">{exp.rejection_reason}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Diajukan</span>
                      <span>{formatDateTime(exp.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* View receipt */}
                    {activeReceipt && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => openReceipt(activeReceipt.storage_path)}
                        disabled={loadingUrl === activeReceipt.storage_path}
                      >
                        {loadingUrl === activeReceipt.storage_path ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <ExternalLink className="size-3" />
                        )}
                        Lihat Struk
                      </Button>
                    )}

                    {/* Owner actions */}
                    {isOwner && exp.status === "submitted" && (
                      <>
                        <Button
                          size="sm"
                          className="gap-2 bg-success text-success-foreground hover:bg-success/90"
                          onClick={() => handleApprove(exp.id)}
                          disabled={processing === exp.id}
                        >
                          {processing === exp.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/5"
                          onClick={() => setRejectDialog({ open: true, expenseId: exp.id, expenseCode: exp.merchant })}
                          disabled={processing === exp.id}
                        >
                          <XCircle className="size-3" /> Tolak
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Audit log */}
                  <ExpenseAuditLog expenseId={exp.id} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Reject dialog */}
      <AlertDialog open={rejectDialog.open} onOpenChange={(o) => setRejectDialog((d) => ({ ...d, open: o }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak Pengeluaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Tolak pengeluaran dari <strong>{rejectDialog.expenseCode}</strong>. Masukkan alasan penolakan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="reject-reason">Alasan Penolakan</Label>
            <Input
              id="reject-reason"
              className="mt-1.5"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Contoh: Struk tidak jelas / nominal tidak sesuai"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectReason("")}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
