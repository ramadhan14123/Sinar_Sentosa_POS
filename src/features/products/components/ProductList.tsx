import { ChefHat, ImagePlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatIDR } from "@/shared/utils/format";

type Props = {
  products: any[];
  isLoading: boolean;
  onEdit: (product: any) => void;
  onDelete: (product: any) => void;
  onOpenRecipe: (product: any) => void;
};

export function ProductList({
  products,
  isLoading,
  onEdit,
  onDelete,
  onOpenRecipe,
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
        {products?.map((p) => (
          <div key={p.id} className="flex flex-col sm:flex-row gap-4 p-4 sm:items-center">
            <div className="grid size-16 place-items-center overflow-hidden rounded-xl bg-primary-soft">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="size-full object-cover" />
              ) : (
                <ImagePlus className="text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatIDR(p.price_idr)} • Stok {p.stock}
              </p>
            </div>
            <div className="flex gap-2 justify-end mt-2 sm:mt-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenRecipe(p)}
              >
                <ChefHat className="size-4 mr-2" /> Resep
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onEdit(p)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => onDelete(p)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {products?.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">
            Belum ada produk.
          </div>
        )}
      </div>
    </div>
  );
}
