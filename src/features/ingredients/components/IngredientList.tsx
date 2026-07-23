import { Edit, History, TrendingUp } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatIDR } from "@/shared/utils/format";

type Props = {
  ingredients: any[];
  isLoading: boolean;
  onEdit: (item: any) => void;
  onOpenAdjust: (item: any) => void;
  onOpenHistory: (item: any) => void;
};

export function IngredientList({
  ingredients,
  isLoading,
  onEdit,
  onOpenAdjust,
  onOpenHistory,
}: Props) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-background p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-background">
      <div className="divide-y">
        {ingredients?.map((i) => {
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
                  onClick={() => onOpenHistory(i)}
                  title="Riwayat Stok"
                >
                  <History className="size-4 mr-2" /> Riwayat
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenAdjust(i)}
                  title="Sesuaikan Stok"
                >
                  <TrendingUp className="size-4 mr-2" /> Adjust
                </Button>
                <button
                  type="button"
                  className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-primary transition-colors border hover:bg-primary/10"
                  onClick={() => onEdit(i)}
                  title="Edit"
                >
                  <Edit className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
        {ingredients?.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            Belum ada data bahan baku.
          </div>
        )}
      </div>
    </div>
  );
}
