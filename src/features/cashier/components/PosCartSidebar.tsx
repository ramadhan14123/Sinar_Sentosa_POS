import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { formatIDR } from "@/shared/utils/format";

type Props = {
  items: any[];
  total: number;
  name: string;
  setName: (v: string) => void;
  cashReceived: string;
  setCashReceived: (v: string) => void;
  updateQuantity: (id: string, amt: number, max: number) => void;
  onSubmit: () => void;
  submitting: boolean;
};

export function PosCartSidebar({
  items,
  total,
  name,
  setName,
  cashReceived,
  setCashReceived,
  updateQuantity,
  onSubmit,
  submitting,
}: Props) {
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <h2 className="font-display text-xl font-extrabold">Pesanan baru</h2>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <p className="text-xs font-medium text-primary">{formatIDR(item.price_idr)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-lg"
                    onClick={() => updateQuantity(item.id, -1, item.stock)}
                  >
                    <Minus />
                  </Button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-lg"
                    onClick={() => updateQuantity(item.id, 1, item.stock)}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center opacity-70">
            <div className="grid size-16 place-items-center rounded-full bg-muted">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Belum ada item.</p>
          </div>
        )}
      </div>
      <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
        <div className="flex items-end justify-between">
          <span className="text-sm font-bold">Total</span>
          <span className="font-display text-3xl font-extrabold text-primary">
            {formatIDR(total)}
          </span>
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="pos-cash"
            className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
          >
            Uang Diterima
          </label>
          <Input
            id="pos-cash"
            type="number"
            min={0}
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
            placeholder="0"
            className="h-11 rounded-xl border-border/60 bg-muted/40"
          />
          {Number(cashReceived) > 0 && Number(cashReceived) >= total && (
            <p className="text-sm font-semibold text-green-600">
              Kembalian: {formatIDR(Number(cashReceived) - total)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="pos-name"
            className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
          >
            Atas Nama
          </label>
          <Input
            id="pos-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Nama pelanggan"
            className="h-11 rounded-xl border-border/60 bg-muted/40"
          />
        </div>
        <Button
          className="h-12 w-full rounded-2xl text-base shadow-color"
          onClick={onSubmit}
          disabled={submitting || !items.length}
        >
          {submitting ? "Memproses..." : "Buat & konfirmasi bayar"}
        </Button>
      </div>
    </div>
  );
}
