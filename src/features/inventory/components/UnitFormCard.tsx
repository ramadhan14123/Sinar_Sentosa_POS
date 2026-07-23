import { Ruler } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

type Props = {
  name: string;
  setName: (v: string) => void;
  symbol: string;
  setSymbol: (v: string) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
};

export function UnitFormCard({ name, setName, symbol, setSymbol, saving, onSubmit }: Props) {
  return (
    <form className="rounded-2xl border bg-background p-5" onSubmit={onSubmit}>
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
  );
}
