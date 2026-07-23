import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle, Wallet } from "lucide-react";
import { useExpenseSummaryStatsQuery } from "../queries/expense.queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";

export function ExpenseSummaryCards() {
  const { data: stats, isLoading, error } = useQuery({
    ...useExpenseSummaryStatsQuery(),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse rounded-2xl border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium bg-muted rounded h-4 w-24"></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-muted rounded h-8 w-32 mb-2"></div>
              <p className="text-xs text-muted-foreground bg-muted rounded h-3 w-16"></p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return null;
  }

  const { limit, approved, pending, rejected } = stats;

  const limitPercentage = Math.min(100, limit.amount > 0 ? (limit.used / limit.amount) * 100 : 0);
  const isOverLimit = limit.used > limit.amount;
  
  const periodLabel = limit.period === "daily" ? "Harian" : limit.period === "monthly" ? "Bulanan" : "Tahunan";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* 1. Limit Status */}
      {limit.enabled ? (
        <Card className={`rounded-2xl border bg-gradient-to-br from-background to-muted/20 shadow-sm transition-all hover:shadow-md ${isOverLimit ? "border-destructive shadow-destructive/10" : "border-indigo-100 dark:border-indigo-900/50"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-foreground">Status Limit</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight mb-2">
              Rp {limit.remaining.toLocaleString("id-ID")}
            </div>
            
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground font-medium">Sisa Limit</p>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium uppercase tracking-wider bg-background">
                {periodLabel}
              </Badge>
            </div>
            
            <Progress 
              value={limitPercentage} 
              className="h-2 bg-secondary"
              indicatorClassName={
                isOverLimit 
                  ? "bg-destructive" 
                  : limitPercentage > 75 
                    ? "bg-amber-500" 
                    : "bg-emerald-500"
              }
            />
            
            <p className="text-[10px] text-muted-foreground mt-2 flex justify-between">
              <span>Terpakai:</span>
              <span className="font-medium text-foreground">Rp {limit.used.toLocaleString("id-ID")} / Rp {limit.amount.toLocaleString("id-ID")}</span>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border border-dashed shadow-none bg-muted/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 opacity-50">
            <CardTitle className="text-sm font-medium">Limitasi Pengeluaran</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[calc(100%-3rem)] pb-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">Limit Tidak Aktif</p>
            <p className="text-[10px] text-muted-foreground mt-1">Bisa diaktifkan di menu Settings</p>
          </CardContent>
        </Card>
      )}

      {/* 2. Disetujui */}
      <Card className="rounded-2xl border bg-gradient-to-br from-background to-muted/20 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-foreground">Disetujui</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tracking-tight">
            Rp {approved.total.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {approved.count} transaksi disetujui
          </p>
        </CardContent>
      </Card>

      {/* 3. Menunggu Approval */}
      <Card className="rounded-2xl border bg-gradient-to-br from-background to-muted/20 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-foreground">Menunggu</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tracking-tight">
            Rp {pending.total.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {pending.count} transaksi pending
          </p>
        </CardContent>
      </Card>

      {/* 4. Ditolak */}
      <Card className="rounded-2xl border bg-gradient-to-br from-background to-muted/20 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-foreground">Ditolak</CardTitle>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <XCircle className="w-4 h-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tracking-tight">
            Rp {rejected.total.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {rejected.count} transaksi ditolak
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
