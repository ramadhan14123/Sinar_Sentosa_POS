import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/shared/layouts/AppShell";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import { deleteCategory, saveCategory } from "@/features/categories/services/category.functions";
import { CategoryList } from "@/features/categories/components/CategoryList";
import { CategoryFormCard } from "@/features/categories/components/CategoryFormCard";

export const Route = createFileRoute("/_authenticated/owner/categories")({
  component: CategoriesPage,
});

function CategoriesPage() {
  const role = useRole();
  const save = useServerFn(saveCategory);
  const remove = useServerFn(deleteCategory);
  const [name, setName] = useState("");
  const { saving, guard } = useActionGuard();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const query = useQuery({
    queryKey: ["categories-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: role.data?.role === "owner",
  });

  if (role.data && role.data.role !== "owner") return <Navigate to="/cashier" replace />;

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    await guard(async () => {
      try {
        await save({ data: { name, sortOrder: query.data?.length ?? 0 } });
        setName("");
        toast.success("Kategori ditambahkan.");
        await query.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menambah kategori.");
      }
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await remove({ data: { id: deleteTarget.id } });
      toast.success("Kategori berhasil dihapus.");
      setDeleteTarget(null);
      await query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus kategori.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell role="owner" eyebrow="Katalog" title="Kategori Menu">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <CategoryFormCard
          name={name}
          setName={setName}
          saving={saving}
          onSubmit={handleAddCategory}
        />

        <CategoryList
          categories={query.data || []}
          isLoading={query.isLoading}
          onOpenDelete={setDeleteTarget}
        />
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kategori{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? Kategori
              yang masih memiliki produk tidak dapat dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
