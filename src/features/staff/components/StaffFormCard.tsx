import { UserPlus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Props = {
  form: { fullName: string; email: string; password: string };
  setForm: (v: any) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function StaffFormCard({ form, setForm, saving, onSubmit }: Props) {
  return (
    <form className="rounded-2xl border bg-background p-6" onSubmit={onSubmit}>
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
        <Button className="w-full" disabled={saving}>
          {saving ? "Menyimpan..." : "Buat akun Kasir"}
        </Button>
      </div>
    </form>
  );
}
