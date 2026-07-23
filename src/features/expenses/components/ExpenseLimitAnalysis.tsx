import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, ArrowRight, Wallet, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { useExpenseLimitAnalysisQuery, useRetentionSettingsQuery } from "../queries/expense.queries";
import { Progress } from "@/shared/components/ui/progress";

export function ExpenseLimitAnalysis() {
  const { data: settings } = useQuery(useRetentionSettingsQuery());

  const limitEnabled = settings?.expense_limit_enabled;
  const period = settings?.expense_limit_period || "monthly";
  const limitAmount = settings?.expense_limit_amount || 0;

  const { data: analysis, isLoading, error } = useQuery(
    useExpenseLimitAnalysisQuery(period, limitAmount)
  );

  if (!limitEnabled) {
    return (
      <div className="flex flex-col items-center justify-center p-10 border rounded-2xl bg-muted/20 border-dashed">
        <Wallet className="size-10 text-muted-foreground opacity-50 mb-4" />
        <h3 className="text-lg font-bold">Limitasi Tidak Aktif</h3>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
          Anda belum mengaktifkan limitasi pengeluaran. Aktifkan di menu Pengaturan Storage & Retensi untuk melihat analisis efisiensi pengeluaran.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6 h-32 bg-muted/50" />
          </Card>
        ))}
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="p-6 border rounded-xl bg-destructive/10 text-destructive text-sm text-center">
        Gagal memuat data analisis limit.
      </div>
    );
  }

  if (analysis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 border rounded-2xl bg-muted/20 border-dashed">
        <CheckCircle2 className="size-10 text-muted-foreground opacity-50 mb-4" />
        <h3 className="text-lg font-bold">Belum Ada Pengeluaran</h3>
        <p className="text-sm text-muted-foreground mt-1 text-center">
          Belum ada data pengajuan pengeluaran untuk dianalisis.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {analysis.map((item) => {
        const percentage = Math.min(100, limitAmount > 0 ? (item.used / limitAmount) * 100 : 0);
        
        return (
          <Card key={item.period_key} className={`overflow-hidden rounded-2xl transition-all hover:shadow-md ${!item.is_efficient ? "border-destructive/30" : "border-emerald-100 dark:border-emerald-950"}`}>
            <CardHeader className={`pb-4 ${!item.is_efficient ? "bg-destructive/5" : "bg-emerald-50/50 dark:bg-emerald-950/20"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {period === "daily" ? `Tanggal: ${item.period_key}` : period === "monthly" ? `Bulan: ${item.period_key}` : `Tahun: ${item.period_key}`}
                    {!item.is_efficient ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="size-3" /> Over Limit
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full dark:text-emerald-400 dark:bg-emerald-900/30">
                        <CheckCircle2 className="size-3" /> Efisien
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Limit Target: Rp {limitAmount.toLocaleString("id-ID")}
                  </CardDescription>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-black tracking-tight">
                    Rp {item.used.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    Total Pengeluaran
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 divide-x border-y">
                <div className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                    <TrendingDown className="size-3.5" /> Sisa / Penghematan
                  </div>
                  <p className="text-lg font-bold">
                    Rp {item.remaining.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive mb-1">
                    <TrendingUp className="size-3.5" /> Over Limit (Kelebihan)
                  </div>
                  <p className="text-lg font-bold">
                    Rp {item.over_limit.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-muted/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Rasio Penggunaan Limit</span>
                  <span className={`text-xs font-bold ${!item.is_efficient ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2" 
                  indicatorClassName={!item.is_efficient ? "bg-destructive" : percentage > 80 ? "bg-amber-500" : "bg-emerald-500"} 
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
