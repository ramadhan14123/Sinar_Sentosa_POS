import {
  ingredientsQuery,
  ingredientCategoriesQuery,
  stockMovementsQuery,
} from "@/features/ingredients/queries/ingredient.queries";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, PackagePlus, Pencil, Trash2, ChefHat, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/shared/layouts/AppShell";
import { ImageCropper } from "@/shared/components/ImageCropper";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import { formatIDR } from "@/shared/utils/format";
import { deleteProduct, saveProduct } from "@/features/products/services/product.functions";
import {
  saveProductRecipes,
  getProductRecipes,
} from "@/features/products/services/recipe.functions";

export const Route = createFileRoute("/_authenticated/owner/products")({ component: ProductsPage });

function ProductsPage() {
  const role = useRole();
  const save = useServerFn(saveProduct);
  const remove = useServerFn(deleteProduct);

  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [recipeOpen, setRecipeOpen] = useState(false);

  const { guard: guardProduct } = useActionGuard();

  const query = useQuery({
    queryKey: ["owner-products"],
    queryFn: async () => {
      const [products, categories] = await Promise.all([
        supabase.from("products").select("*").order("name"),
        supabase.from("categories").select("*").order("sort_order"),
      ]);
      if (products.error || categories.error) throw new Error();
      return { products: products.data, categories: categories.data };
    },
    enabled: role.data?.role === "owner",
  });

  if (role.data && role.data.role !== "owner") return <Navigate to="/cashier" replace />;

  return (
    <AppShell role="owner" eyebrow="Katalog" title="Manajemen Produk">
      <div className="mb-6 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <PackagePlus className="mr-2 size-4" />
              Tambah produk
            </Button>
          </DialogTrigger>
          <ProductDialog
            product={editing}
            categories={query.data?.categories ?? []}
            onSave={async (data: any) => {
              await guardProduct(async () => {
                try {
                  await save({ data });
                  toast.success("Produk disimpan.");
                  setOpen(false);
                  await query.refetch();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Gagal menyimpan produk.");
                }
              });
            }}
          />
        </Dialog>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-background">
        <div className="divide-y">
          {query.data?.products.map((p) => (
            <div key={p.id} className="flex flex-col sm:flex-row gap-4 p-4 sm:items-center">
              <div className="grid size-16 place-items-center overflow-hidden rounded-xl bg-primary-soft">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="size-full object-cover" />
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
                  onClick={() => {
                    setEditingRecipe(p);
                    setRecipeOpen(true);
                  }}
                >
                  <ChefHat className="size-4 mr-2" /> Resep
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setEditing(p);
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={async () => {
                    await guardProduct(async () => {
                      if (!confirm(`Hapus ${p.name}?`)) return;
                      await remove({ data: { id: p.id } });
                      await query.refetch();
                    });
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={recipeOpen} onOpenChange={setRecipeOpen}>
        {editingRecipe && (
          <RecipeDialog product={editingRecipe} onClose={() => setRecipeOpen(false)} />
        )}
      </Dialog>
    </AppShell>
  );
}

function ProductDialog({ product, categories, onSave }: any) {
  const { saving, guard } = useActionGuard();
  const emptyForm = {
    id: undefined,
    name: "",
    description: "",
    price_idr: 0,
    stock: 0,
    category_id: null,
    image_url: null,
    is_active: true,
  };
  const productForm = product
    ? {
        id: product.id,
        name: product.name ?? "",
        description: product.description ?? "",
        price_idr: product.price_idr ?? 0,
        stock: product.stock ?? 0,
        category_id: product.category_id ?? null,
        image_url: product.image_url ?? null,
        is_active: product.is_active ?? true,
      }
    : emptyForm;

  const [form, setForm] = useState(productForm);
  const [source, setSource] = useState("");
  const [crop, setCrop] = useState(false);

  useEffect(() => {
    setForm(
      product
        ? {
            id: product.id,
            name: product.name ?? "",
            description: product.description ?? "",
            price_idr: product.price_idr ?? 0,
            stock: product.stock ?? 0,
            category_id: product.category_id ?? null,
            image_url: product.image_url ?? null,
            is_active: product.is_active ?? true,
          }
        : emptyForm,
    );
    setSource("");
    setCrop(false);
  }, [product]);

  async function selectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1024 * 1024)
      return toast.error("Gunakan file gambar maksimal 1 MB.");
    if (file.size > 500 * 1024) toast.warning("Gambar akan dikompresi hingga sekitar 500 KB.");
    setSource(URL.createObjectURL(file));
    setCrop(true);
  }

  async function upload(file: File) {
    const path = `${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: "image/webp" });
    if (error) return toast.error(error.message);
    const { data } = await supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (!data) return;
    setForm((old) => ({ ...old, image_url: data.signedUrl }));
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{product ? "Edit produk" : "Tambah produk"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-bold">Nama produk</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold">Harga</label>
          <Input
            type="number"
            min={1}
            value={form.price_idr}
            onChange={(e) => setForm({ ...form, price_idr: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold">Stok</label>
          <Input
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-bold">Kategori</label>
          <select
            value={form.category_id ?? "none"}
            onChange={(event) =>
              setForm({
                ...form,
                category_id: event.target.value === "none" ? null : event.target.value,
              })
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="none">Tanpa kategori</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-bold">Deskripsi</label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-bold">Foto 1:1</label>
          <Input type="file" accept="image/*" onChange={selectFile} />
          {form.image_url && (
            <img
              src={form.image_url}
              alt={`Foto ${form.name || "produk"}`}
              className="mt-3 size-24 rounded-xl object-cover"
            />
          )}
        </div>
      </div>
      <Button
        className="w-full"
        disabled={saving}
        onClick={() =>
          guard(async () => {
            await onSave(form);
          })
        }
      >
        {saving ? "Menyimpan..." : "Simpan produk"}
      </Button>
      <ImageCropper source={source} open={crop} onOpenChange={setCrop} onComplete={upload} />
    </DialogContent>
  );
}

function RecipeDialog({ product, onClose }: { product: any; onClose: () => void }) {
  const ingredientsQ = useQuery(ingredientsQuery);
  const saveRecipe = useServerFn(saveProductRecipes);
  const { saving, guard } = useActionGuard();

  const [items, setItems] = useState<{ ingredient_id: string; quantity: string }[]>([]);

  // Load existing recipe
  useEffect(() => {
    getProductRecipes({ data: { productId: product.id } }).then((recipes) => {
      setItems(
        recipes.map((r: any) => ({
          ingredient_id: r.ingredient_id,
          quantity: r.quantity.toString(),
        })),
      );
    });
  }, [product.id]);

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
        <DialogTitle>Resep: {product.name}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Bahan baku ini akan otomatis berkurang stoknya setiap kali produk {product.name} terjual
          (Phase 2).
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
