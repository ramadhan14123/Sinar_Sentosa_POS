import { Plus, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatIDR } from "@/shared/utils/format";

export function PurchaseOrderForm({
  id,
  supplierId,
  setSupplierId,
  invoiceNumber,
  setInvoiceNumber,
  purchaseDate,
  setPurchaseDate,
  notes,
  setNotes,
  items,
  setItems,
  suppliersQ,
  ingredientsQ,
  handleSaveForm,
  setView,
  saving,
}: {
  id?: string;
  supplierId: string;
  setSupplierId: (v: string) => void;
  invoiceNumber: string;
  setInvoiceNumber: (v: string) => void;
  purchaseDate: string;
  setPurchaseDate: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  items: { ingredient_id: string; quantity: string; unit_cost: string }[];
  setItems: (items: any[]) => void;
  suppliersQ: any;
  ingredientsQ: any;
  handleSaveForm: (e: React.FormEvent) => void;
  setView: (v: "list") => void;
  saving: boolean;
}) {
  function addItem() {
    setItems([...items, { ingredient_id: "", quantity: "", unit_cost: "" }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: string) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  return (
    <form onSubmit={handleSaveForm} className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button type="button" variant="ghost" onClick={() => setView("list")}>
          <ArrowLeft className="mr-2 size-4" /> Kembali
        </Button>
        <h2 className="text-2xl font-bold">{id ? "Edit Draft PO" : "Buat PO Baru"}</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-background p-6 space-y-4">
          <h3 className="font-bold text-lg border-b pb-2">Informasi Utama</h3>
          <div>
            <label className="mb-1 block text-sm font-semibold">Supplier *</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              required
            >
              <option value="">Pilih Supplier</option>
              {suppliersQ.data?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">No. Invoice / Referensi *</label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
              placeholder="INV-2023-001"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Tanggal Pembelian *</label>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold">Catatan</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-6 flex flex-col">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <h3 className="font-bold text-lg">Item Pembelian</h3>
            <Button type="button" size="sm" onClick={addItem}>
              <Plus className="mr-1 size-4" /> Tambah Item
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground mt-10">Belum ada item ditambahkan.</p>
            ) : (
              items.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-start border p-3 rounded-lg relative bg-muted/20"
                >
                  <div className="flex-1 space-y-2">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={item.ingredient_id}
                      onChange={(e) => updateItem(index, "ingredient_id", e.target.value)}
                      required
                    >
                      <option value="">Pilih Bahan</option>
                      {ingredientsQ.data?.map((ing: any) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.unit?.symbol})
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="h-9"
                        required
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Harga Satuan"
                        value={item.unit_cost}
                        onChange={(e) => updateItem(index, "unit_cost", e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <div className="flex justify-between font-bold text-lg">
                <span>Estimasi Total:</span>
                <span className="text-primary">
                  {formatIDR(
                    items.reduce(
                      (sum, item) =>
                        sum + parseFloat(item.quantity || "0") * parseFloat(item.unit_cost || "0"),
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => setView("list")} className="w-32">
          Batal
        </Button>
        <Button type="submit" className="w-48" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan sbg Draft"}
        </Button>
      </div>
    </form>
  );
}
