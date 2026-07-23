import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PackagePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogTrigger } from "@/shared/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import { deleteProduct, saveProduct } from "@/features/products/services/product.functions";

import { ProductList } from "@/features/products/components/ProductList";
import { ProductFormDialog } from "@/features/products/components/ProductFormDialog";
import { ProductRecipeDialog } from "@/features/products/components/ProductRecipeDialog";

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

  async function handleSaveProduct(data: any) {
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
  }

  async function handleDeleteProduct(p: any) {
    await guardProduct(async () => {
      if (!confirm(`Hapus ${p.name}?`)) return;
      await remove({ data: { id: p.id } });
      await query.refetch();
    });
  }

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
          <ProductFormDialog
            product={editing}
            categories={query.data?.categories ?? []}
            onSave={handleSaveProduct}
          />
        </Dialog>
      </div>

      <ProductList
        products={query.data?.products ?? []}
        isLoading={query.isLoading}
        onEdit={(p) => {
          setEditing(p);
          setOpen(true);
        }}
        onDelete={handleDeleteProduct}
        onOpenRecipe={(p) => {
          setEditingRecipe(p);
          setRecipeOpen(true);
        }}
      />

      <Dialog open={recipeOpen} onOpenChange={setRecipeOpen}>
        {editingRecipe && (
          <ProductRecipeDialog product={editingRecipe} onClose={() => setRecipeOpen(false)} />
        )}
      </Dialog>
    </AppShell>
  );
}
