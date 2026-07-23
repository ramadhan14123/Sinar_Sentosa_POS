import { Box } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Props = {
  id?: string;
  name: string;
  setName: (v: string) => void;
  sku: string;
  setSku: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  unitId: string;
  setUnitId: (v: string) => void;
  minStock: string;
  setMinStock: (v: string) => void;
  categories: any[];
  units: any[];
  saving: boolean;
  onReset: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function IngredientFormCard({
  id,
  name,
  setName,
  sku,
  setSku,
  categoryId,
  setCategoryId,
  unitId,
  setUnitId,
  minStock,
  setMinStock,
  categories,
  units,
  saving,
  onReset,
  onSubmit,
}: Props) {
  return (
    <form
      className="rounded-2xl border bg-background p-5 self-start sticky top-6"
      onSubmit={onSubmit}
    >
      <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
        <Box />
      </div>
      <h2 className="mt-4 text-lg font-bold">{id ? "Edit Bahan" : "Bahan baru"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Data master bahan baku untuk inventori.
      </p>
      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold">Nama Bahan *</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Daging Ayam Fillet"
            maxLength={100}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">SKU (Kode)</label>
          <Input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="AYM-001"
            maxLength={100}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-semibold">Kategori *</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Pilih Kategori</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Satuan *</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              required
            >
              <option value="">Pilih Satuan</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold">Stok Minimum</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            placeholder="10"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Notifikasi akan muncul jika stok di bawah batas ini.
          </p>
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        {id && (
          <Button type="button" variant="outline" className="flex-1" onClick={onReset}>
            Batal
          </Button>
        )}
        <Button className="flex-1" disabled={saving}>
          {saving ? "Menyimpan..." : id ? "Simpan Perubahan" : "Tambah Bahan"}
        </Button>
      </div>
    </form>
  );
}
