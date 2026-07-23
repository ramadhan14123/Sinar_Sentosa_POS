import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Archive, HardDrive, Loader2, PlayCircle, Save, Settings2, Trash2, Wallet } from "lucide-react";
import { AppShell } from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { useRole } from "@/shared/hooks/use-role";
import { useRetentionSettingsQuery } from "@/features/expenses/queries/expense.queries";
import {
  getRetentionSettings,
  saveRetentionSettings,
  runRetentionCleanup,
  type CleanupSummary,
} from "@/features/expenses/services/retention.functions";

export const Route = createFileRoute("/app/settings/storage")({
  component: StorageSettingsPage,
});

function StorageSettingsPage() {
  const role = useRole();
  const qc = useQueryClient();
  const getSettingsFn = useServerFn(getRetentionSettings);
  const saveSettingsFn = useServerFn(saveRetentionSettings);
  const runCleanupFn = useServerFn(runRetentionCleanup);

  const retQuery = useRetentionSettingsQuery();
  const { data: settings, isLoading } = useQuery({
    ...retQuery,
    queryFn: () => getSettingsFn({}),
  });

  const [activeDays, setActiveDays] = useState<number | "">(""); 
  const [coldDays, setColdDays] = useState<number | "">(""); 
  const [deleteDays, setDeleteDays] = useState<number | "">("");
  const [cashierSeeAll, setCashierSeeAll] = useState(false);
  const [expenseLimitEnabled, setExpenseLimitEnabled] = useState(false);
  const [expenseLimitPeriod, setExpenseLimitPeriod] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [expenseLimitAmount, setExpenseLimitAmount] = useState<number | "">("");
  const [expenseLimitResetTime, setExpenseLimitResetTime] = useState<string>("00:00");
  
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupSummary | null>(null);

  // Sync once settings load
  if (settings && !loaded) {
    setActiveDays(settings.receipt_active_days);
    setColdDays(settings.receipt_cold_days);
    setDeleteDays(settings.receipt_delete_days);
    setCashierSeeAll(settings.cashier_see_all_expenses);
    setExpenseLimitEnabled(settings.expense_limit_enabled);
    setExpenseLimitPeriod(settings.expense_limit_period);
    setExpenseLimitAmount(settings.expense_limit_amount);
    setExpenseLimitResetTime(settings.expense_limit_reset_time || "00:00");
    setLoaded(true);
  }

  function validateForm() {
    const a = Number(activeDays);
    const c = Number(coldDays);
    const d = Number(deleteDays);
    if (!a || a <= 0) return "Active Storage harus lebih dari 0 hari.";
    if (!c || c <= a) return "Cold Storage harus lebih besar dari Active Storage.";
    if (!d || d <= c) return "Delete File harus lebih besar dari Cold Storage.";
    return null;
  }

  async function handleSave() {
    const err = validateForm();
    if (err) return toast.error(err);
    if (expenseLimitEnabled && (!expenseLimitAmount || Number(expenseLimitAmount) <= 0)) {
      return toast.error("Nominal Limit harus diisi dan lebih dari 0.");
    }
    if (expenseLimitEnabled && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(expenseLimitResetTime)) {
      return toast.error("Waktu reset limit tidak valid (Gunakan format HH:mm)");
    }
    
    setSaving(true);
    try {
      await saveSettingsFn({
        data: {
          receipt_active_days: Number(activeDays),
          receipt_cold_days: Number(coldDays),
          receipt_delete_days: Number(deleteDays),
          cashier_see_all_expenses: cashierSeeAll,
          expense_limit_enabled: expenseLimitEnabled,
          expense_limit_period: expenseLimitPeriod,
          expense_limit_amount: Number(expenseLimitAmount || 0),
          expense_limit_reset_time: expenseLimitResetTime,
        },
      });
      toast.success("Pengaturan storage disimpan.");
      qc.invalidateQueries({ queryKey: ["retention-settings"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCleanup() {
    setRunning(true);
    setCleanupResult(null);
    try {
      const result = await runCleanupFn({});
      setCleanupResult(result);
      if (result.errors.length === 0) {
        toast.success(`Cleanup selesai: ${result.movedToCold} dipindahkan, ${result.deletedFiles} dihapus.`);
      } else {
        toast.warning(`Cleanup selesai dengan ${result.errors.length} error.`);
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal menjalankan cleanup.");
    } finally {
      setRunning(false);
    }
  }

  const userRole = role.data?.role === "owner" ? "owner" : "cashier";

  return (
    <AppShell role={userRole} eyebrow="Pengaturan" title="Storage & Retensi">
      <div className="mx-auto max-w-2xl space-y-8">
        
        {/* Expense Limit Config */}
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            <Wallet className="size-5" /> Pengaturan Limitasi Pengeluaran
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Batasi pengeluaran per periode. Nominal limit bisa diubah sewaktu-waktu.
          </p>

          {isLoading ? (
            <div className="mt-6 h-32 animate-pulse rounded-xl bg-muted" />
          ) : (
            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="text-sm font-bold">Aktifkan Limit Pengeluaran</p>
                  <p className="text-xs text-muted-foreground">
                    Jika aktif, pengajuan yang melewati limit akan ditolak.
                  </p>
                </div>
                <Switch checked={expenseLimitEnabled} onCheckedChange={setExpenseLimitEnabled} />
              </div>

              {expenseLimitEnabled && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label>Periode Limit</Label>
                    <select
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
                      value={expenseLimitPeriod}
                      onChange={(e) => setExpenseLimitPeriod(e.target.value as any)}
                    >
                      <option value="daily">Harian</option>
                      <option value="monthly">Bulanan</option>
                      <option value="yearly">Tahunan</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="limit-amount">
                      Nominal Limit <span className="text-muted-foreground">(Rp)</span>
                    </Label>
                    <Input
                      id="limit-amount"
                      type="number"
                      min="0"
                      value={expenseLimitAmount}
                      onChange={(e) => setExpenseLimitAmount(e.target.value ? Number(e.target.value) : "")}
                      className="mt-1.5"
                      placeholder="Contoh: 1000000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reset-time">
                      Waktu Reset <span className="text-muted-foreground">(HH:mm)</span>
                    </Label>
                    <Input
                      id="reset-time"
                      type="time"
                      value={expenseLimitResetTime}
                      onChange={(e) => setExpenseLimitResetTime(e.target.value)}
                      className="mt-1.5"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground leading-tight">Limit harian/bulanan akan dihitung mulai dari jam ini.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Retention Policy Config */}
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            <HardDrive className="size-5" /> Kebijakan Retensi Struk
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur berapa lama file foto struk disimpan sebelum dipindahkan atau dihapus. Data transaksi tidak akan pernah dihapus.
          </p>

          {isLoading ? (
            <div className="mt-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {/* Flow visualization */}
              <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                <div className="flex flex-col items-center gap-0.5">
                  <HardDrive className="size-4 text-blue-500" />
                  <span className="font-bold text-blue-600">Online</span>
                  <span>{activeDays || "—"} hari</span>
                </div>
                <div className="h-px flex-1 border-t border-dashed" />
                <div className="flex flex-col items-center gap-0.5">
                  <Archive className="size-4 text-purple-500" />
                  <span className="font-bold text-purple-600">Cold</span>
                  <span>{coldDays ? Number(coldDays) - Number(activeDays || 0) : "—"} hari</span>
                </div>
                <div className="h-px flex-1 border-t border-dashed" />
                <div className="flex flex-col items-center gap-0.5">
                  <Trash2 className="size-4 text-destructive" />
                  <span className="font-bold text-destructive">Hapus</span>
                  <span>Hari ke-{deleteDays || "—"}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="active-days">
                    Active Storage <span className="text-muted-foreground">(hari)</span>
                  </Label>
                  <Input
                    id="active-days"
                    type="number"
                    min="1"
                    value={activeDays}
                    onChange={(e) => setActiveDays(e.target.value ? Number(e.target.value) : "")}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Default: 14 hari</p>
                </div>
                <div>
                  <Label htmlFor="cold-days">
                    Cold Storage <span className="text-muted-foreground">(hari)</span>
                  </Label>
                  <Input
                    id="cold-days"
                    type="number"
                    min="1"
                    value={coldDays}
                    onChange={(e) => setColdDays(e.target.value ? Number(e.target.value) : "")}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Default: 21 hari</p>
                </div>
                <div>
                  <Label htmlFor="delete-days">
                    Hapus File <span className="text-muted-foreground">(hari)</span>
                  </Label>
                  <Input
                    id="delete-days"
                    type="number"
                    min="1"
                    value={deleteDays}
                    onChange={(e) => setDeleteDays(e.target.value ? Number(e.target.value) : "")}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Default: 30 hari</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="text-sm font-bold">Kasir lihat semua pengeluaran</p>
                  <p className="text-xs text-muted-foreground">
                    Jika aktif, kasir dapat melihat pengeluaran seluruh staf. Jika tidak, kasir hanya melihat miliknya sendiri.
                  </p>
                </div>
                <Switch checked={cashierSeeAll} onCheckedChange={setCashierSeeAll} />
              </div>
            </div>
          )}
        </section>

        {/* Global Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || isLoading} className="h-11 w-full sm:w-auto sm:px-8">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>

        {/* Manual Cleanup */}
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            <PlayCircle className="size-5" /> Jalankan Cleanup Manual
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Proses retensi akan memindahkan file ke Cold Storage dan menghapus file yang sudah melewati batas retensi sesuai konfigurasi di atas. Metadata transaksi tidak akan dihapus.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>File yang dihapus tidak dapat dipulihkan. Pastikan pengaturan retensi sudah sesuai sebelum menjalankan cleanup.</span>
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="h-11 w-full gap-2" disabled={running}>
                  {running ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PlayCircle className="size-4" />
                  )}
                  {running ? "Menjalankan Cleanup..." : "Jalankan Cleanup Sekarang"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Jalankan Storage Cleanup?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sistem akan memindahkan file yang melebihi <strong>Active Storage Duration</strong> ke Cold Storage, dan menghapus file yang melebihi <strong>File Deletion Duration</strong>. Metadata transaksi tidak akan dihapus.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanup}>
                    Ya, Jalankan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Cleanup result */}
            {cleanupResult && (
              <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
                <p className="font-bold">Hasil Cleanup</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dipindahkan ke Cold Storage</span>
                  <span className="font-semibold text-blue-600">{cleanupResult.movedToCold} file</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File Dihapus</span>
                  <span className="font-semibold text-destructive">{cleanupResult.deletedFiles} file</span>
                </div>
                {cleanupResult.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-destructive">{cleanupResult.errors.length} Error:</p>
                    <ul className="mt-1 space-y-0.5">
                      {cleanupResult.errors.map((e, i) => (
                        <li key={i} className="text-xs text-destructive">• {e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Dijalankan: {new Date(cleanupResult.ranAt).toLocaleString("id-ID")}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
