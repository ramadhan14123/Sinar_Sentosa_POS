import { unitsQuery } from "@/features/inventory/queries/unit.queries";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ruler, Trash2 } from "lucide-react";
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
import { Input } from "@/shared/components/ui/input";
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import { deleteUnit, saveUnit, getUnits } from "@/features/inventory/services/unit.functions";

export const Route = createFileRoute("/_authenticated/owner/units")({ component: UnitsPage });

function UnitsPage() {
  const role = useRole();
  const save = useServerFn(saveUnit);
  const remove = useServerFn(deleteUnit);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const { saving, guard } = useActionGuard();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const query = useQuery({
    ...unitsQuery,
    enabled: role.data?.role === "owner",
  });

  if (role.data && role.data.role !== "owner") return <Navigate to="/cashier" replace />;

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await remove({ data: { id: deleteTarget.id } });
      toast.success("Satuan berhasil dihapus.");
      setDeleteTarget(null);
      await query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus satuan.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell role="owner" eyebrow="Inventory" title="Satuan Bahan">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          className="rounded-2xl border bg-background p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name || !symbol) return toast.error("Semua field wajib diisi");
            await guard(async () => {
              try {
                await save({ data: { name, symbol } });
                setName("");
                setSymbol("");
                toast.success("Satuan ditambahkan.");
                await query.refetch();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Gagal menambah satuan.");
              }
            });
          }}
        >
          <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Ruler />
          </div>
          <h2 className="mt-4 text-lg font-bold">Satuan baru</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Satuan untuk perhitungan stok dan resep.
          </p>
          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-semibold">Nama Satuan</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Kilogram"
                maxLength={50}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Simbol</label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Contoh: kg"
                maxLength={20}
              />
            </div>
          </div>
          <Button className="mt-5 w-full" disabled={saving}>
            {saving ? "Menyimpan..." : "Tambah satuan"}
          </Button>
        </form>

        <div className="overflow-hidden rounded-2xl border bg-background">
          <div className="divide-y">
            {query.data?.map((u) => (
              <div className="flex items-center gap-4 p-5" key={u.id}>
                <div className="flex-1">
                  <p className="font-bold">{u.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Simbol:{" "}
                    <span className="font-mono font-medium text-foreground">{u.symbol}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10"
                  onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {query.data?.length === 0 && (
              <div className="p-10 text-center text-muted-foreground">Belum ada data satuan.</div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Satuan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus satuan{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? Satuan
              yang masih digunakan oleh bahan baku tidak dapat dihapus.
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
