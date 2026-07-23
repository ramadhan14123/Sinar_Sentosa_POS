import { Archive, HardDrive, Trash2 } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";

type Props = {
  isLoading: boolean;
  activeDays: number | "";
  setActiveDays: (v: number | "") => void;
  coldDays: number | "";
  setColdDays: (v: number | "") => void;
  deleteDays: number | "";
  setDeleteDays: (v: number | "") => void;
  cashierSeeAll: boolean;
  setCashierSeeAll: (v: boolean) => void;
};

export function RetentionPolicyConfigCard({
  isLoading,
  activeDays,
  setActiveDays,
  coldDays,
  setColdDays,
  deleteDays,
  setDeleteDays,
  cashierSeeAll,
  setCashierSeeAll,
}: Props) {
  const coldDuration = coldDays && activeDays ? Number(coldDays) - Number(activeDays) : null;

  return (
    <section className="rounded-2xl border bg-background shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          <HardDrive className="size-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold leading-tight">
            Kebijakan Retensi Struk
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Durasi penyimpanan file foto struk
          </p>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Flow Timeline */}
            <div className="flex items-stretch gap-2 rounded-xl border bg-muted/30 p-3">
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <HardDrive className="size-3.5" />
                </div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">AKTIF</span>
                <span className="text-[11px] font-semibold text-foreground">
                  {activeDays || "—"} hari
                </span>
              </div>

              <div className="flex items-center text-muted-foreground/40 px-1">→</div>

              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className="grid size-8 place-items-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                  <Archive className="size-3.5" />
                </div>
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">COLD</span>
                <span className="text-[11px] font-semibold text-foreground">
                  {coldDuration !== null ? `+${coldDuration} hari` : "— hari"}
                </span>
              </div>

              <div className="flex items-center text-muted-foreground/40 px-1">→</div>

              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className="grid size-8 place-items-center rounded-lg bg-red-100 text-destructive dark:bg-red-950">
                  <Trash2 className="size-3.5" />
                </div>
                <span className="text-[10px] font-bold text-destructive">HAPUS</span>
                <span className="text-[11px] font-semibold text-foreground">
                  Hari ke-{deleteDays || "—"}
                </span>
              </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label
                  htmlFor="active-days"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  Aktif (hari)
                </Label>
                <Input
                  id="active-days"
                  type="number"
                  min="1"
                  value={activeDays}
                  onChange={(e) => setActiveDays(e.target.value ? Number(e.target.value) : "")}
                  className="mt-1.5"
                  placeholder="14"
                />
              </div>
              <div>
                <Label
                  htmlFor="cold-days"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  Cold (hari)
                </Label>
                <Input
                  id="cold-days"
                  type="number"
                  min="1"
                  value={coldDays}
                  onChange={(e) => setColdDays(e.target.value ? Number(e.target.value) : "")}
                  className="mt-1.5"
                  placeholder="21"
                />
              </div>
              <div>
                <Label
                  htmlFor="delete-days"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  Hapus (hari)
                </Label>
                <Input
                  id="delete-days"
                  type="number"
                  min="1"
                  value={deleteDays}
                  onChange={(e) => setDeleteDays(e.target.value ? Number(e.target.value) : "")}
                  className="mt-1.5"
                  placeholder="30"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* Kasir Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Kasir lihat semua pengeluaran</p>
                <p className="text-xs text-muted-foreground">
                  Jika tidak aktif, kasir hanya melihat pengeluaran miliknya
                </p>
              </div>
              <Switch checked={cashierSeeAll} onCheckedChange={setCashierSeeAll} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
