import { Truck } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";

type Props = {
  id?: string;
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  saving: boolean;
  onReset: () => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function SupplierFormCard({
  id,
  name,
  setName,
  phone,
  setPhone,
  email,
  setEmail,
  address,
  setAddress,
  notes,
  setNotes,
  saving,
  onReset,
  onSubmit,
}: Props) {
  return (
    <form
      className="rounded-2xl border bg-background p-5 self-start sticky top-6"
      onSubmit={onSubmit}
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
          <Button type="button" variant="outline" className="flex-1" onClick={onReset}>
            Batal
          </Button>
        )}
        <Button className="flex-1" disabled={saving}>
          {saving ? "Menyimpan..." : id ? "Simpan Perubahan" : "Tambah Supplier"}
        </Button>
      </div>
    </form>
  );
}
