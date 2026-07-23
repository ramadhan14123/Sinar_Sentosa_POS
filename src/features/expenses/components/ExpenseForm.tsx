/**
 * ExpenseForm — Submit new expense with receipt image upload + client-side compression.
 * Uses Canvas API for compression: no extra dependencies needed.
 */
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImagePlus, Loader2, Receipt, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useExpenseCategoriesQuery } from "../queries/expense.queries";
import { submitExpense } from "../services/expense.functions";
import { supabase } from "@/integrations/supabase/client";

// ─── Image Compression ────────────────────────────────────────────────────────
async function compressImage(file: File, maxWidth = 1200, quality = 0.65): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Kompresi gagal."));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => reject(new Error("Gagal membaca gambar."));
    img.src = url;
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type FormState = {
  category_id: string;
  merchant: string;
  receipt_number: string;
  receipt_date: string;
  amount: string;
  description: string;
};

const EMPTY: FormState = {
  category_id: "",
  merchant: "",
  receipt_number: "",
  receipt_date: new Date().toISOString().slice(0, 10),
  amount: "",
  description: "",
};

type Props = {
  onSuccess?: () => void;
};

export function ExpenseForm({ onSuccess }: Props) {
  const qc = useQueryClient();
  const submitFn = useServerFn(submitExpense);
  const catQuery = useExpenseCategoriesQuery();
  const { data: categories = [] } = useQuery(catQuery);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      const compressedFile = new File([compressed], file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      });
      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressed));
      toast.success(`Gambar dikompresi: ${(compressedFile.size / 1024).toFixed(0)} KB`);
    } catch (e: any) {
      toast.error(e.message || "Gagal memproses gambar.");
    } finally {
      setCompressing(false);
    }
  }

  function clearImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!imageFile) return toast.error("Foto struk wajib diupload.");
    if (!form.category_id) return toast.error("Kategori wajib dipilih.");
    if (!form.merchant.trim()) return toast.error("Merchant wajib diisi.");
    if (!form.receipt_date) return toast.error("Tanggal struk wajib diisi.");
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return toast.error("Nominal harus lebih dari 0.");
    if (!form.description.trim()) return toast.error("Deskripsi wajib diisi.");

    setSubmitting(true);
    try {
      // 1. Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Sesi berakhir, silakan login ulang.");
      const userId = userData.user.id;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const randomId = crypto.randomUUID();
      const storagePath = `${userId}/${year}/${month}/${randomId}.jpg`;

      // 2. Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("expense-receipts")
        .upload(storagePath, imageFile, { contentType: "image/jpeg", upsert: false });

      if (uploadErr) throw new Error("Gagal upload foto: " + uploadErr.message);

      // 3. Submit expense record
      await submitFn({
        data: {
          category_id: form.category_id,
          merchant: form.merchant.trim(),
          receipt_number: form.receipt_number.trim() || null,
          receipt_date: form.receipt_date,
          amount,
          description: form.description.trim(),
          storage_path: storagePath,
          file_size_bytes: imageFile.size,
        },
      });

      toast.success("Pengeluaran berhasil diajukan!");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setForm(EMPTY);
      clearImage();
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message || "Gagal mengajukan pengeluaran.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Receipt image upload */}
      <div>
        <Label className="mb-2 block">
          Foto Struk <span className="text-destructive">*</span>
        </Label>
        {imagePreview ? (
          <div className="relative w-full max-w-sm">
            <img
              src={imagePreview}
              alt="Preview struk"
              className="w-full rounded-xl border object-cover"
              style={{ maxHeight: 280 }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearImage}
              className="absolute right-2 top-2 bg-background/80 backdrop-blur"
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed py-10 transition hover:border-primary hover:bg-muted/40"
          >
            {compressing ? (
              <Loader2 className="size-8 animate-spin text-primary" />
            ) : (
              <ImagePlus className="size-8 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-muted-foreground">
              {compressing ? "Mengkompresi gambar..." : "Klik untuk upload foto struk"}
            </span>
            <span className="text-xs text-muted-foreground">JPEG / WebP / PNG — max 2MB setelah kompresi</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/webp,image/png"
          className="hidden"
          onChange={handleImageChange}
        />
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="exp-category">
          Kategori <span className="text-destructive">*</span>
        </Label>
        <Select value={form.category_id} onValueChange={(v) => update("category_id", v)}>
          <SelectTrigger id="exp-category" className="mt-1.5">
            <SelectValue placeholder="Pilih kategori..." />
          </SelectTrigger>
          <SelectContent>
            {categories.filter((c) => c.is_active).map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Merchant */}
      <div>
        <Label htmlFor="exp-merchant">
          Merchant / Toko <span className="text-destructive">*</span>
        </Label>
        <Input
          id="exp-merchant"
          value={form.merchant}
          onChange={(e) => update("merchant", e.target.value)}
          placeholder="Nama toko/vendor"
          className="mt-1.5"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Receipt Number */}
        <div>
          <Label htmlFor="exp-receipt-no">Nomor Struk</Label>
          <Input
            id="exp-receipt-no"
            value={form.receipt_number}
            onChange={(e) => update("receipt_number", e.target.value)}
            placeholder="Jika tersedia"
            className="mt-1.5"
          />
        </div>

        {/* Receipt Date */}
        <div>
          <Label htmlFor="exp-date">
            Tanggal Struk <span className="text-destructive">*</span>
          </Label>
          <Input
            id="exp-date"
            type="date"
            value={form.receipt_date}
            onChange={(e) => update("receipt_date", e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>

      {/* Amount */}
      <div>
        <Label htmlFor="exp-amount">
          Nominal (Rp) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="exp-amount"
          type="number"
          min="1"
          value={form.amount}
          onChange={(e) => update("amount", e.target.value)}
          placeholder="0"
          className="mt-1.5"
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="exp-desc">
          Keterangan <span className="text-destructive">*</span>
        </Label>
        <Input
          id="exp-desc"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Jelaskan keperluan pengeluaran ini"
          className="mt-1.5"
        />
      </div>

      <Button type="submit" className="h-11 w-full" disabled={submitting || compressing}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Mengajukan...
          </>
        ) : (
          <>
            <UploadCloud className="size-4" /> Ajukan Pengeluaran
          </>
        )}
      </Button>
    </form>
  );
}
