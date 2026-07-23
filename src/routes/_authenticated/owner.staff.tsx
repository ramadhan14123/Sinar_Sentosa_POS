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
import { Input } from "@/shared/components/ui/input";
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import {
  createCashier,
  deleteCashier,
  getStaffWithEmail,
} from "@/features/staff/services/staff.functions";
import { StaffList } from "@/features/staff/components/StaffList";
import { StaffFormCard } from "@/features/staff/components/StaffFormCard";

export const Route = createFileRoute("/_authenticated/owner/staff")({ component: StaffPage });

function StaffPage() {
  const role = useRole();
  const create = useServerFn(createCashier);
  const remove = useServerFn(deleteCashier);
  const fetchStaff = useServerFn(getStaffWithEmail);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const { saving, guard } = useActionGuard();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; full_name: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const query = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetchStaff(),
    enabled: role.data?.role === "owner",
  });

  if (role.data && role.data.role !== "owner") return <Navigate to="/cashier" replace />;

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    await guard(async () => {
      try {
        await create({ data: form });
        toast.success("Akun Kasir berhasil dibuat.");
        setForm({ fullName: "", email: "", password: "" });
        await query.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal membuat akun.");
      }
    });
  }

  async function handleDelete() {
    if (!deleteTarget || confirmText !== "HAPUS") return;
    setIsDeleting(true);
    try {
      await remove({ data: { userId: deleteTarget.id } });
      toast.success("Akun Kasir berhasil dihapus.");
      setDeleteTarget(null);
      setConfirmText("");
      await query.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus akun.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AppShell role="owner" eyebrow="Akses" title="Manajemen Staf">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <StaffFormCard
          form={form}
          setForm={setForm}
          saving={saving}
          onSubmit={handleCreateStaff}
        />

        <StaffList
          staffList={query.data || []}
          isLoading={query.isLoading}
          onOpenDelete={(s) => {
            setDeleteTarget(s);
            setConfirmText("");
          }}
        />
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kasir</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus akun{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.full_name}</span>{" "}
              secara permanen, termasuk riwayat aksesnya. Untuk melanjutkan, ketik{" "}
              <span className="font-semibold text-foreground">HAPUS</span> di bawah ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            placeholder='Ketik "HAPUS" untuk mengonfirmasi'
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={confirmText !== "HAPUS" || isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
