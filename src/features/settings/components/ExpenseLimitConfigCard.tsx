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
  return (
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
                <p className="mt-1 text-[10px] text-muted-foreground leading-tight">
                  Limit harian/bulanan akan dihitung mulai dari jam ini.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
