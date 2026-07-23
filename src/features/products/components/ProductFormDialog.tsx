import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { ImageCropper } from "@/shared/components/ImageCropper";
import { supabase } from "@/integrations/supabase/client";
import { useActionGuard } from "@/shared/hooks/use-action-guard";

type Props = {
  product: any;
  categories: any[];
  onSave: (data: any) => Promise<void>;
};

export function ProductFormDialog({ product, categories, onSave }: Props) {
  const { saving, guard } = useActionGuard();

  const emptyForm = {
    id: undefined,
    name: "",
    description: "",
    price_idr: 0,
    stock: 0,
    category_id: null,
    image_url: null,
    is_active: true,
  };

  const [form, setForm] = useState<any>(emptyForm);
  const [source, setSource] = useState("");
  const [crop, setCrop] = useState(false);

  useEffect(() => {
    setForm(
      product
        ? {
            id: product.id,
            name: product.name ?? "",
            description: product.description ?? "",
            price_idr: product.price_idr ?? 0,
            stock: product.stock ?? 0,
            category_id: product.category_id ?? null,
            image_url: product.image_url ?? null,
            is_active: product.is_active ?? true,
          }
        : emptyForm,
    );
    setSource("");
    setCrop(false);
  }, [product]);

  async function selectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1024 * 1024)
      return toast.error("Gunakan file gambar maksimal 1 MB.");
    if (file.size > 500 * 1024) toast.warning("Gambar akan dikompresi hingga sekitar 500 KB.");
    setSource(URL.createObjectURL(file));
    setCrop(true);
  }

  async function upload(file: File) {
    const path = `${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: "image/webp" });
    if (error) return toast.error(error.message);
    const { data } = await supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (!data) return;
    setForm((old: any) => ({ ...old, image_url: data.signedUrl }));
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{product ? "Edit produk" : "Tambah produk"}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-bold">Nama produk</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold">Harga</label>
          <Input
            type="number"
            min={1}
            value={form.price_idr}
            onChange={(e) => setForm({ ...form, price_idr: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold">Stok</label>
          <Input
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-bold">Kategori</label>
          <select
            value={form.category_id ?? "none"}
            onChange={(event) =>
              setForm({
                ...form,
                category_id: event.target.value === "none" ? null : event.target.value,
              })
            }
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="none">Tanpa kategori</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-bold">Deskripsi</label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-sm font-bold">Foto 1:1</label>
          <Input type="file" accept="image/*" onChange={selectFile} />
          {form.image_url && (
            <img
              src={form.image_url}
              alt={`Foto ${form.name || "produk"}`}
              className="mt-3 size-24 rounded-xl object-cover"
            />
          )}
        </div>
      </div>
      <Button
        className="w-full"
        disabled={saving}
        onClick={() =>
          guard(async () => {
            await onSave(form);
          })
        }
      >
        {saving ? "Menyimpan..." : "Simpan produk"}
      </Button>
      <ImageCropper source={source} open={crop} onOpenChange={setCrop} onComplete={upload} />
    </DialogContent>
  );
}
