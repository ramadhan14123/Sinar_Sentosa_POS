import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRole } from "@/hooks/use-role";
import { useActionGuard } from "@/hooks/use-action-guard";
import { createCashier, deleteCashier, getStaffWithEmail } from "@/lib/pos.functions";

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
        <form
          className="rounded-2xl border bg-background p-6"
          onSubmit={async (e) => {
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
          }}
        >
          <div className="grid size-11 place-items-center rounded-xl bg-info-soft text-info">
            <UserPlus />
          </div>
          <h2 className="mt-4 text-xl font-bold">Tambah Kasir</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat kredensial yang akan digunakan staf untuk login.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold">Nama lengkap</label>
              <Input
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">Email</label>
              <Input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold">Password sementara</label>
              <Input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <Button className="w-full" disabled={saving}>{saving ? "Menyimpan..." : "Buat akun Kasir"}</Button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border bg-background">
          <div className="border-b p-5">
            <h2 className="font-bold">Daftar Kasir</h2>
          </div>
          {query.data?.length ? (
            <div className="divide-y">
              {query.data.map((p) => (
                <div key={p.id} className="flex items-center gap-4 p-5">
                  <div className="grid size-11 place-items-center rounded-full bg-success-soft text-success">
                    <ShieldCheck />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.full_name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail className="size-3 shrink-0" />
                      {p.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10"
                    onClick={() => {
                      setDeleteTarget({ id: p.id, full_name: p.full_name });
                      setConfirmText("");
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">Belum ada akun Kasir.</div>
          )}
        </div>
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
