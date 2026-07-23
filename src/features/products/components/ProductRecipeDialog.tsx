import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import { ingredientsQuery } from "@/features/ingredients/queries/ingredient.queries";
import {
  saveProductRecipes,
  getProductRecipes,
} from "@/features/products/services/recipe.functions";

type Props = {
  product: any;
  onClose: () => void;
};

export function ProductRecipeDialog({ product, onClose }: Props) {
  const ingredientsQ = useQuery(ingredientsQuery);
  const saveRecipe = useServerFn(saveProductRecipes);
  const { saving, guard } = useActionGuard();

  const [items, setItems] = useState<{ ingredient_id: string; quantity: string }[]>([]);

  useEffect(() => {
    if (product?.id) {
      getProductRecipes({ data: { productId: product.id } }).then((recipes) => {
        setItems(
          recipes.map((r: any) => ({
            ingredient_id: r.ingredient_id,
            quantity: r.quantity.toString(),
          })),
        );
      });
    }
  }, [product?.id]);

  function addItem() {
    setItems([...items, { ingredient_id: "", quantity: "" }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: string) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  async function handleSave() {
    const parsedItems = items.map((i) => ({
      ingredient_id: i.ingredient_id,
      quantity: parseFloat(i.quantity),
    }));

    if (parsedItems.some((i) => !i.ingredient_id || isNaN(i.quantity) || i.quantity <= 0)) {
      return toast.error("Ada data bahan baku resep yang tidak valid");
    }

    await guard(async () => {
      try {
        await saveRecipe({
          data: {
            productId: product.id,
            recipes: parsedItems,
          },
        });
        toast.success("Resep berhasil disimpan.");
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan resep.");
      }
    });
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
      <DialogHeader>
        <DialogTitle>Resep: {product?.name}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Bahan baku ini akan otomatis berkurang stoknya setiap kali produk {product?.name} terjual.
        </p>

        <div className="space-y-3">
          {items.map((item, index) => {
            const selectedIng = ingredientsQ.data?.find((ing) => ing.id === item.ingredient_id);
            return (
              <div key={index} className="flex gap-2 items-center">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={item.ingredient_id}
                  onChange={(e) => updateItem(index, "ingredient_id", e.target.value)}
                >
                  <option value="">Pilih Bahan</option>
                  {ingredientsQ.data?.map((ing) => (
                    <option
                      key={ing.id}
                      value={ing.id}
                      disabled={items.some((i) => i !== item && i.ingredient_id === ing.id)}
                    >
                      {ing.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="Kuantitas"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  className="w-32"
                />
                <span className="w-12 text-sm text-muted-foreground">
                  {selectedIng?.unit?.symbol || "-"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive shrink-0"
                  onClick={() => removeItem(index)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="w-full border-dashed"
        >
          <Plus className="size-4 mr-2" /> Tambah Bahan Resep
        </Button>
      </div>

      <Button
        className="w-full mt-4"
        disabled={saving || ingredientsQ.isLoading}
        onClick={handleSave}
      >
        {saving ? "Menyimpan..." : "Simpan Resep"}
      </Button>
    </DialogContent>
  );
}
