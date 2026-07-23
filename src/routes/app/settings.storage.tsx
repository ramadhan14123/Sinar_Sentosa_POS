import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { AppShell } from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { useRole } from "@/shared/hooks/use-role";
import { useRetentionSettingsQuery } from "@/features/expenses/queries/expense.queries";
import {
  getRetentionSettings,
  saveRetentionSettings,
  runRetentionCleanup,
  type CleanupSummary,
} from "@/features/expenses/services/retention.functions";

import { ExpenseLimitConfigCard } from "@/features/settings/components/ExpenseLimitConfigCard";
import { RetentionPolicyConfigCard } from "@/features/settings/components/RetentionPolicyConfigCard";
import { ManualCleanupCard } from "@/features/settings/components/ManualCleanupCard";

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
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 2-column grid: left = Limit + Cleanup, right = Retensi */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="space-y-5">
            <ExpenseLimitConfigCard
              isLoading={isLoading}
              expenseLimitEnabled={expenseLimitEnabled}
              setExpenseLimitEnabled={setExpenseLimitEnabled}
              expenseLimitPeriod={expenseLimitPeriod}
              setExpenseLimitPeriod={setExpenseLimitPeriod}
              expenseLimitAmount={expenseLimitAmount}
              setExpenseLimitAmount={setExpenseLimitAmount}
              expenseLimitResetTime={expenseLimitResetTime}
              setExpenseLimitResetTime={setExpenseLimitResetTime}
            />

            <ManualCleanupCard
              running={running}
              cleanupResult={cleanupResult}
              onRunCleanup={handleCleanup}
            />
          </div>

          {/* RIGHT COLUMN */}
          <RetentionPolicyConfigCard
            isLoading={isLoading}
            activeDays={activeDays}
            setActiveDays={setActiveDays}
            coldDays={coldDays}
            setColdDays={setColdDays}
            deleteDays={deleteDays}
            setDeleteDays={setDeleteDays}
            cashierSeeAll={cashierSeeAll}
            setCashierSeeAll={setCashierSeeAll}
          />
        </div>

        {/* Save Button inside page */}
        <div className="flex justify-end border-t pt-5">
          <Button
            onClick={handleSave}
            disabled={saving || isLoading}
            className="h-11 w-full gap-2 sm:w-auto sm:min-w-[200px] rounded-xl text-sm"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
