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
import { suppliersQuery } from "@/features/suppliers/queries/supplier.queries";
import { deleteSupplier, saveSupplier } from "@/features/suppliers/services/supplier.functions";
import { SupplierList } from "@/features/suppliers/components/SupplierList";
import { SupplierFormCard } from "@/features/suppliers/components/SupplierFormCard";

export const Route = createFileRoute("/_authenticated/owner/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const role = useRole();
  const save = useServerFn(saveSupplier);
  const remove = useServerFn(deleteSupplier);
  const { saving, guard } = useActionGuard();

  const [id, setId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const query = useQuery({
    ...suppliersQuery,
    enabled: role.data?.role === "owner",
  });

  if (role.data && role.data.role !== "owner") return <Navigate to="/cashier" replace />;

  function resetForm() {
    setId(undefined);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
  }

  function handleEdit(s: any) {
    setId(s.id);
    setName(s.name);
    setPhone(s.phone || "");
    setEmail(s.email || "");
    setAddress(s.address || "");
    setNotes(s.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return toast.error("Nama supplier wajib diisi");
    await guard(async () => {
      try {
        await save({ data: { id, name, phone, email, address, notes } });
        resetForm();
        toast.success(id ? "Supplier diperbarui." : "Supplier ditambahkan.");
        await query.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan supplier.");
      }
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await remove({ data: { id: deleteTarget.id } });
      toast.success("Supplier berhasil dihapus.");
      setDeleteTarget(null);
      if (id === deleteTarget.id) resetForm();
      await query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus supplier.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell role="owner" eyebrow="Inventory" title="Supplier">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <SupplierFormCard
          id={id}
          name={name}
          setName={setName}
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          address={address}
          setAddress={setAddress}
          notes={notes}
          setNotes={setNotes}
          saving={saving}
          onReset={resetForm}
          onSubmit={handleSaveSupplier}
        />

        <SupplierList
          suppliers={query.data || []}
          isLoading={query.isLoading}
          onEdit={handleEdit}
          onDeleteTarget={setDeleteTarget}
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
            <AlertDialogTitle>Hapus Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus supplier{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? Supplier
              yang memiliki riwayat pembelian tidak dapat dihapus.
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
