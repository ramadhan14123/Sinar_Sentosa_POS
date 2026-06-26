import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Gagal memproses gambar."))),
      "image/webp",
      quality,
    );
  });
}

async function cropImage(source: string, zoom: number) {
  const image = new Image();
  image.src = source;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia.");

  const baseSize = Math.min(image.naturalWidth, image.naturalHeight);
  const cropSize = baseSize / zoom;
  const sourceX = (image.naturalWidth - cropSize) / 2;
  const sourceY = (image.naturalHeight - cropSize) / 2;
  ctx.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, 800, 800);

  let blob = await canvasToBlob(canvas, 0.82);
  if (blob.size > 500 * 1024) blob = await canvasToBlob(canvas, 0.68);
  if (blob.size > 500 * 1024) blob = await canvasToBlob(canvas, 0.52);
  return new File([blob], "product.webp", { type: "image/webp" });
}

export function ImageCropper({ source, open, onOpenChange, onComplete }: { source: string; open: boolean; onOpenChange: (value: boolean) => void; onComplete: (file: File) => void }) {
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);

  async function finish() {
    if (!source) return;
    try {
      setBusy(true);
      onComplete(await cropImage(source, zoom));
      onOpenChange(false);
    } catch {
      toast.error("Gambar gagal diproses.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Potong gambar produk</DialogTitle>
          <DialogDescription>Rasio dikunci 1:1 agar seluruh foto menu terlihat konsisten.</DialogDescription>
        </DialogHeader>
        <div className="relative aspect-square overflow-hidden rounded-xl bg-foreground">
          {source && (
            <img
              src={source}
              alt="Pratinjau potong gambar produk"
              className="size-full object-cover transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          )}
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={finish} disabled={busy}>{busy ? "Mengompres..." : "Gunakan gambar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}