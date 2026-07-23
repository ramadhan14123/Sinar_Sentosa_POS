import { Wallet } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";

type Props = {
  isLoading: boolean;
  expenseLimitEnabled: boolean;
  setExpenseLimitEnabled: (v: boolean) => void;
  expenseLimitPeriod: "daily" | "monthly" | "yearly";
  setExpenseLimitPeriod: (v: "daily" | "monthly" | "yearly") => void;
  expenseLimitAmount: number | "";
  setExpenseLimitAmount: (v: number | "") => void;
  expenseLimitResetTime: string;
  setExpenseLimitResetTime: (v: string) => void;
};

export function ExpenseLimitConfigCard({
  isLoading,
  expenseLimitEnabled,
  setExpenseLimitEnabled,
  expenseLimitPeriod,
  setExpenseLimitPeriod,
  expenseLimitAmount,
  setExpenseLimitAmount,
  expenseLimitResetTime,
  setExpenseLimitResetTime,
}: Props) {
  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5";

  return (
    <section className="rounded-2xl border bg-background shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <Wallet className="size-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold leading-tight">
            Limitasi Pengeluaran
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Batasi pengeluaran kasir per periode
          </p>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-14 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Toggle Row */}
            <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Aktifkan Limit</p>
                <p className="text-xs text-muted-foreground">
                  Pengajuan melebihi limit akan ditolak otomatis
                </p>
              </div>
              <Switch
                checked={expenseLimitEnabled}
                onCheckedChange={setExpenseLimitEnabled}
              />
            </div>

            {/* Detail Fields — shown only when enabled */}
            {expenseLimitEnabled && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Periode Limit
                  </Label>
                  <select
                    className={selectClass}
                    value={expenseLimitPeriod}
                    onChange={(e) => setExpenseLimitPeriod(e.target.value as any)}
                  >
                    <option value="daily">Harian</option>
                    <option value="monthly">Bulanan</option>
                    <option value="yearly">Tahunan</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label
                      htmlFor="limit-amount"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      Nominal Limit (Rp)
                    </Label>
                    <Input
                      id="limit-amount"
                      type="number"
                      min="0"
                      value={expenseLimitAmount}
                      onChange={(e) =>
                        setExpenseLimitAmount(e.target.value ? Number(e.target.value) : "")
                      }
                      className="mt-1.5"
                      placeholder="Contoh: 1000000"
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="reset-time"
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      Waktu Reset
                    </Label>
                    <Input
                      id="reset-time"
                      type="time"
                      value={expenseLimitResetTime}
                      onChange={(e) => setExpenseLimitResetTime(e.target.value)}
                      className="mt-1.5"
                    />
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Limit dihitung ulang dari jam ini
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
