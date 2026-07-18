import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FolderPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { useActionGuard } from "@/hooks/use-action-guard";
import { deleteCategory, saveCategory } from "@/lib/pos.functions";

export const Route = createFileRoute("/_authenticated/owner/categories")({ component: CategoriesPage });

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
        <form
          className="rounded-2xl border bg-background p-5"
          onSubmit={async (e) => {
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
          }}
        >
          <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <FolderPlus />
          </div>
          <h2 className="mt-4 text-lg font-bold">Kategori baru</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kategori akan muncul sebagai filter menu pelanggan.
          </p>
          <Input
            className="mt-5"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Minuman"
            maxLength={60}
          />
          <Button className="mt-3 w-full" disabled={saving}>{saving ? "Menyimpan..." : "Tambah kategori"}</Button>
        </form>

        <div className="overflow-hidden rounded-2xl border bg-background">
          <div className="divide-y">
            {query.data?.map((c, index) => (
              <div className="flex items-center gap-4 p-5" key={c.id}>
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-sm font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Urutan tampil {c.sort_order}</p>
                </div>
                <button
                  type="button"
                  className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10"
                  onClick={() => setDeleteTarget({ id: c.id, name: c.name })}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kategori{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
              Kategori yang masih memiliki produk tidak dapat dihapus.
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