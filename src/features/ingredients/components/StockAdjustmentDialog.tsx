import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIngredient: any;
  adjustType: "adjustment" | "waste" | "return";
  setAdjustType: (v: "adjustment" | "waste" | "return") => void;
  adjustQuantity: string;
  setAdjustQuantity: (v: string) => void;
  adjustNotes: string;
  setAdjustNotes: (v: string) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  selectedIngredient,
  adjustType,
  setAdjustType,
  adjustQuantity,
  setAdjustQuantity,
  adjustNotes,
  setAdjustNotes,
  saving,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok (Stock Opname)</DialogTitle>
          <DialogDescription>
            Ubah stok untuk{" "}
            <span className="font-bold text-foreground">{selectedIngredient?.name}</span>. Stok
            saat ini: {selectedIngredient?.current_stock} {selectedIngredient?.unit?.symbol}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button disabled={saving}>{saving ? "Memproses..." : "Simpan Penyesuaian"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
