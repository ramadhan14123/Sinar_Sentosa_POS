import { suppliersQuery } from "@/features/suppliers/queries/supplier.queries";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Truck, Trash2, Edit } from "lucide-react";
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
import { Textarea } from "@/shared/components/ui/textarea";
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import {
  deleteSupplier,
  saveSupplier,
  getSuppliers,
} from "@/features/suppliers/services/supplier.functions";

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
        <form
          className="rounded-2xl border bg-background p-5 self-start sticky top-6"
          onSubmit={async (e) => {
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
          }}
        >
          <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
            <Truck />
          </div>
          <h2 className="mt-4 text-lg font-bold">{id ? "Edit Supplier" : "Supplier baru"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Data pemasok bahan baku untuk purchase order.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">Nama Supplier *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="PT. Segar Alam"
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Telepon</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08123456789"
                maxLength={50}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kontak@segaralam.com"
                maxLength={100}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Alamat</label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Raya Pasar No. 12"
                maxLength={500}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">Catatan</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pengiriman libur di hari minggu"
                maxLength={500}
              />
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            {id && (
              <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>
                Batal
              </Button>
            )}
            <Button className="flex-1" disabled={saving}>
              {saving ? "Menyimpan..." : id ? "Simpan Perubahan" : "Tambah Supplier"}
            </Button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border bg-background">
          <div className="divide-y">
            {query.data?.map((s) => (
              <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start" key={s.id}>
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-lg">{s.name}</p>
                  <div className="text-sm text-muted-foreground flex flex-col gap-0.5">
                    {s.phone && <p>📞 {s.phone}</p>}
                    {s.email && <p>📧 {s.email}</p>}
                    {s.address && <p>📍 {s.address}</p>}
                    {s.notes && <p className="italic mt-1 text-xs">Catatan: {s.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                  <button
                    type="button"
                    className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary/10"
                    onClick={() => handleEdit(s)}
                    title="Edit"
                  >
                    <Edit className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10"
                    onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                    title="Hapus"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
            {query.data?.length === 0 && (
              <div className="p-10 text-center text-muted-foreground">Belum ada data supplier.</div>
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
