import { FolderPlus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Props = {
  name: string;
  setName: (v: string) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function CategoryFormCard({ name, setName, saving, onSubmit }: Props) {
  return (
    <form className="rounded-2xl border bg-background p-5" onSubmit={onSubmit}>
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
      <Button className="mt-3 w-full" disabled={saving}>
        {saving ? "Menyimpan..." : "Tambah kategori"}
      </Button>
    </form>
  );
}
