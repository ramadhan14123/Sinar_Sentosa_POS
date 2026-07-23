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
  return (
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
  );
}
