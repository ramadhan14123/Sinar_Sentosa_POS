import { unitsQuery } from "@/features/inventory/queries/unit.queries";
import {
  ingredientsQuery,
  ingredientCategoriesQuery,
  stockMovementsQuery,
} from "@/features/ingredients/queries/ingredient.queries";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Box, Plus, Trash2, Edit, TrendingUp, History } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import { formatIDR } from "@/shared/utils/format";
import {
  saveIngredient,
  getIngredients,
  adjustStock,
} from "@/features/ingredients/services/ingredient.functions";
import { getStockMovements } from "@/features/ingredients/services/stock.functions";

export const Route = createFileRoute("/_authenticated/owner/ingredients")({
  component: IngredientsPage,
});

function IngredientsPage() {
  const role = useRole();
  const save = useServerFn(saveIngredient);
  const adjust = useServerFn(adjustStock);
  const { saving, guard } = useActionGuard();

  const [id, setId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [minStock, setMinStock] = useState("");

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);

  const [adjustType, setAdjustType] = useState<"adjustment" | "waste" | "return">("adjustment");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const query = useQuery({
    ...ingredientsQuery,
    enabled: role.data?.role === "owner",
  });

  const unitsQ = useQuery({
    ...unitsQuery,
    enabled: role.data?.role === "owner",
  });

  const catsQ = useQuery({
    ...ingredientCategoriesQuery,
    enabled: role.data?.role === "owner",
  });

  const movementsQ = useQuery({
    ...stockMovementsQuery(id || ""),
    enabled: !!selectedIngredient && historyModalOpen,
  });

  if (role.data && role.data.role !== "owner") return <Navigate to="/cashier" replace />;

  function resetForm() {
    setId(undefined);
    setName("");
    setSku("");
    setCategoryId("");
    setUnitId("");
    setMinStock("");
  }

  function handleEdit(i: any) {
    setId(i.id);
    setName(i.name);
    setSku(i.sku || "");
    setCategoryId(i.category_id);
    setUnitId(i.unit_id);
    setMinStock(i.minimum_stock.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openAdjustModal(i: any) {
    setSelectedIngredient(i);
    setAdjustType("adjustment");
    setAdjustQuantity("");
    setAdjustNotes("");
    setAdjustModalOpen(true);
  }

  function openHistoryModal(i: any) {
    setSelectedIngredient(i);
    setHistoryModalOpen(true);
  }

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIngredient || !adjustQuantity) return;

    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty)) return toast.error("Kuantitas tidak valid");

    await guard(async () => {
      try {
        await adjust({
          data: {
            ingredientId: selectedIngredient.id,
            adjustmentType: adjustType,
            quantity: qty,
            notes: adjustNotes,
          },
        });
        toast.success("Stok berhasil disesuaikan.");
        setAdjustModalOpen(false);
        await query.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyesuaikan stok.");
      }
    });
  }

  return (
    <AppShell role="owner" eyebrow="Inventory" title="Bahan Baku">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <form
          className="rounded-2xl border bg-background p-5 self-start sticky top-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name || !categoryId || !unitId)
              return toast.error("Nama, Kategori, dan Satuan wajib diisi");

            await guard(async () => {
              try {
                await save({
                  data: {
                    id,
                    name,
                    sku,
                    category_id: categoryId,
                    unit_id: unitId,
                    minimum_stock: minStock ? parseFloat(minStock) : 0,
                    is_active: true,
                  },
                });
                resetForm();
                toast.success(id ? "Bahan diperbarui." : "Bahan ditambahkan.");
                await query.refetch();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Gagal menyimpan bahan.");
              }
            });
          }}
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
                  {catsQ.data?.map((c) => (
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
                  {unitsQ.data?.map((u) => (
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
              <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
                Batal
              </Button>
            )}
            <Button className="flex-1" disabled={saving || unitsQ.isLoading || catsQ.isLoading}>
              {saving ? "Menyimpan..." : id ? "Simpan Perubahan" : "Tambah Bahan"}
            </Button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border bg-background">
          <div className="divide-y">
            {query.data?.map((i) => {
              const isLowStock = i.current_stock <= i.minimum_stock;
              return (
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center" key={i.id}>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">{i.name}</p>
                      {i.sku && (
                        <span className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                          {i.sku}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
                      <p>Kategori: {i.category?.name}</p>
                      <p>
                        HPP Avg:{" "}
                        <span className="font-semibold text-foreground">
                          {formatIDR(i.average_cost)}
                        </span>
                        /{i.unit?.symbol}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end sm:items-center gap-1 sm:px-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Stok Saat Ini
                    </p>
                    <p
                      className={`text-2xl font-black ${isLowStock ? "text-destructive" : "text-primary"}`}
                    >
                      {i.current_stock}{" "}
                      <span className="text-base font-medium">{i.unit?.symbol}</span>
                    </p>
                    {isLowStock && (
                      <p className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded font-bold">
                        Stok Menipis (Min: {i.minimum_stock})
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 sm:mt-0 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openHistoryModal(i)}
                      title="Riwayat Stok"
                    >
                      <History className="size-4 mr-2" /> Riwayat
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAdjustModal(i)}
                      title="Sesuaikan Stok"
                    >
                      <TrendingUp className="size-4 mr-2" /> Adjust
                    </Button>
                    <button
                      type="button"
                      className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-primary transition-colors border hover:bg-primary/10"
                      onClick={() => handleEdit(i)}
                      title="Edit"
                    >
                      <Edit className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {query.data?.length === 0 && (
              <div className="p-10 text-center text-muted-foreground">
                Belum ada data bahan baku.
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Penyesuaian Stok (Stock Opname)</DialogTitle>
            <DialogDescription>
              Ubah stok untuk{" "}
              <span className="font-bold text-foreground">{selectedIngredient?.name}</span>. Stok
              saat ini: {selectedIngredient?.current_stock} {selectedIngredient?.unit?.symbol}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustSubmit} className="space-y-4 mt-2">
            <div>
              <label className="mb-1 block text-sm font-semibold">Tipe Penyesuaian</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
              >
                <option value="adjustment">Penyesuaian Manual (+/-)</option>
                <option value="waste">Pembuangan/Rusak (-)</option>
                <option value="return">Retur dari Dapur (+)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">
                Kuantitas Perubahan{" "}
                {adjustType === "waste"
                  ? "(harus negatif)"
                  : adjustType === "return"
                    ? "(harus positif)"
                    : ""}
              </label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="0.001"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder="Contoh: 1.5 atau -0.5"
                  required
                />
                <span className="font-semibold text-muted-foreground">
                  {selectedIngredient?.unit?.symbol}
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Keterangan / Alasan</label>
              <Input
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder="Tumpah, basi, salah hitung, dll."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setAdjustModalOpen(false)}>
                Batal
              </Button>
              <Button disabled={saving}>{saving ? "Memproses..." : "Simpan Penyesuaian"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Riwayat Stok: {selectedIngredient?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4 border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="p-3 text-left font-semibold">Waktu</th>
                  <th className="p-3 text-left font-semibold">Tipe</th>
                  <th className="p-3 text-right font-semibold">Stok Awal</th>
                  <th className="p-3 text-right font-semibold">Perubahan</th>
                  <th className="p-3 text-right font-semibold">Stok Akhir</th>
                  <th className="p-3 text-left font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movementsQ.isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center">
                      Memuat riwayat...
                    </td>
                  </tr>
                ) : movementsQ.data?.movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center">
                      Belum ada riwayat pergerakan stok.
                    </td>
                  </tr>
                ) : (
                  movementsQ.data?.movements.map((m: any) => (
                    <tr key={m.id}>
                      <td className="p-3">{new Date(m.created_at).toLocaleString("id-ID")}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                          ${
                            m.movement_type === "purchase"
                              ? "bg-blue-100 text-blue-700"
                              : m.movement_type === "sale"
                                ? "bg-orange-100 text-orange-700"
                                : m.movement_type === "waste"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {m.stock_before} {selectedIngredient?.unit?.symbol}
                      </td>
                      <td
                        className={`p-3 text-right font-bold ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </td>
                      <td className="p-3 text-right font-bold">
                        {m.stock_after} {selectedIngredient?.unit?.symbol}
                      </td>
                      <td className="p-3 max-w-[200px] truncate" title={m.notes}>
                        {m.notes || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
