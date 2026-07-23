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
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import { unitsQuery } from "@/features/inventory/queries/unit.queries";
import { deleteUnit, saveUnit } from "@/features/inventory/services/unit.functions";

import { UnitList } from "@/features/inventory/components/UnitList";
import { UnitFormCard } from "@/features/inventory/components/UnitFormCard";

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

  async function handleAddUnit(e: React.FormEvent) {
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
  }

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
        <UnitFormCard
          name={name}
          setName={setName}
          symbol={symbol}
          setSymbol={setSymbol}
          saving={saving}
          onSubmit={handleAddUnit}
        />

        <UnitList
          units={query.data || []}
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
