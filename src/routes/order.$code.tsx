import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock3, Download, ReceiptText, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatIDR } from "@/lib/format";

export const Route = createFileRoute("/order/$code")({ component: OrderPage, head: ({ params }) => ({ meta: [{ title: `Pesanan ${params.code} — RasaPOS` }, { name: "description", content: "Pantau status pesanan dan unduh struk pembayaran." }] }) });
type OrderData = { id: string; order_code: string; customer_name: string; status: string; total_idr: number; created_at: string; items: { name: string; price: number; quantity: number; subtotal: number }[] };
const steps = ["pending_payment", "confirmed", "processing", "completed"];

function OrderPage() {
  const { code } = Route.useParams(); const [order, setOrder] = useState<OrderData | null>(null); const [error, setError] = useState("");
  useEffect(() => { const token = localStorage.getItem(`order-token:${code}`); if (!token) { setError("Pesanan tidak ditemukan di perangkat ini."); return; } const load = async () => { const { data } = await supabase.rpc("get_order_by_code", { p_order_code: code, p_tracking_token: token }); if (data && typeof data === "object" && !Array.isArray(data)) setOrder(data as unknown as OrderData); else setError("Pesanan tidak ditemukan."); }; load(); const timer = window.setInterval(load, 5000); return () => window.clearInterval(timer); }, [code]);
  if (error) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><ReceiptText className="mx-auto size-10 text-muted-foreground"/><h1 className="mt-4 text-2xl font-bold">{error}</h1><Button asChild className="mt-6"><Link to="/">Kembali ke menu</Link></Button></div></div>;
  if (!order) return <div className="grid min-h-screen place-items-center"><Clock3 className="size-10 animate-pulse text-primary" /></div>;
  const currentOrder = order;
  const current = Math.max(0, steps.indexOf(currentOrder.status)); const paid = ["confirmed", "processing", "completed"].includes(currentOrder.status);
  async function downloadReceipt() {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    // 80mm thermal-receipt style page (~226pt wide)
    const W = 226;
    const M = 14; // margin
    const innerW = W - M * 2;
    const ink = rgb(0.1, 0.1, 0.12);
    const muted = rgb(0.45, 0.45, 0.5);
    const line = rgb(0.82, 0.82, 0.85);

    // Pre-compute height
    const itemRows = currentOrder.items.reduce((acc, i) => {
      const label = `${i.quantity} x ${i.name}`;
      const lines = Math.max(1, Math.ceil((label.length * 4.6) / innerW));
      return acc + lines + 1; // name lines + qty/price line
    }, 0);
    const height = 220 + itemRows * 14;
    const page = pdf.addPage([W, height]);

    let y = height - 22;
    const center = (txt: string, size: number, f = font, color = ink) => {
      const w = f.widthOfTextAtSize(txt, size);
      page.drawText(txt, { x: (W - w) / 2, y, size, font: f, color });
      y -= size + 4;
    };
    const left = (txt: string, size: number, f = font, color = ink) => {
      page.drawText(txt, { x: M, y, size, font: f, color });
    };
    const right = (txt: string, size: number, f = font, color = ink) => {
      const w = f.widthOfTextAtSize(txt, size);
      page.drawText(txt, { x: W - M - w, y, size, font: f, color });
    };
    const row = (l: string, r: string, size = 9, f = font, color = ink) => {
      left(l, size, f, color); right(r, size, f, color); y -= size + 4;
    };
    const hr = (dashed = false) => {
      y -= 2;
      if (dashed) {
        for (let x = M; x < W - M; x += 4) {
          page.drawLine({ start: { x, y }, end: { x: x + 2, y }, thickness: 0.6, color: line });
        }
      } else {
        page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.6, color: line });
      }
      y -= 8;
    };
    const wrap = (txt: string, size: number, maxW: number) => {
      const words = txt.split(" "); const lines: string[] = []; let cur = "";
      words.forEach((w) => {
        const test = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(test, size) > maxW) { if (cur) lines.push(cur); cur = w; } else cur = test;
      });
      if (cur) lines.push(cur);
      return lines;
    };

    // Header
    center("RASAPOS", 16, bold);
    center("Struk Pembayaran", 8, font, muted);
    y -= 4;
    hr();

    // Meta
    row("No.", currentOrder.order_code, 9, bold);
    row("Tanggal", formatDateTime(currentOrder.created_at), 8, font, muted);
    row("Pelanggan", currentOrder.customer_name, 8, font, muted);
    row("Status", "LUNAS", 9, bold);
    hr(true);

    // Items
    currentOrder.items.forEach((i) => {
      const nameLines = wrap(i.name, 9, innerW);
      nameLines.forEach((ln) => { left(ln, 9, bold); y -= 11; });
      const qtyLine = `${i.quantity} x ${formatIDR(i.price)}`;
      left(qtyLine, 8, font, muted);
      right(formatIDR(i.subtotal), 9);
      y -= 14;
    });
    hr();

    // Totals
    row("Subtotal", formatIDR(currentOrder.total_idr), 9);
    y -= 2;
    row("TOTAL", formatIDR(currentOrder.total_idr), 12, bold);
    hr();

    // Footer
    y -= 2;
    center("Terima kasih atas kunjungan Anda", 8, font, muted);
    center("Selamat menikmati!", 8, font, muted);

    const bytes = await pdf.save();
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `struk-${currentOrder.order_code}.pdf`; a.click();
    URL.revokeObjectURL(url);
  }
  return <main className="min-h-screen bg-surface px-4 py-8"><div className="mx-auto max-w-2xl"><div className="mb-8 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-warning-soft text-warning"><Utensils /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">{order.order_code}</p><h1 className="mt-2 text-3xl font-extrabold">{paid ? "Pembayaran dikonfirmasi" : "Bayar di kasir, ya"}</h1><p className="mt-2 text-muted-foreground">Pesanan atas nama <strong className="text-foreground">{order.customer_name}</strong></p></div><section className="rounded-3xl border bg-background p-6 shadow-sm sm:p-8"><div className="grid grid-cols-4">{steps.map((step, index) => <div key={step} className="text-center"><div className={`mx-auto grid size-9 place-items-center rounded-full ${index <= current ? "bg-success text-background" : "bg-muted text-muted-foreground"}`}>{index < current ? <Check className="size-4"/> : index + 1}</div><p className="mt-2 text-[10px] font-bold sm:text-xs">{["Menunggu", "Dikonfirmasi", "Diproses", "Selesai"][index]}</p></div>)}</div><div className="my-8 border-t"/><div className="space-y-4">{order.items.map((item) => <div key={item.name} className="flex justify-between gap-4"><div><p className="font-bold">{item.quantity}× {item.name}</p><p className="text-xs text-muted-foreground">{formatIDR(item.price)} / item</p></div><span className="font-semibold">{formatIDR(item.subtotal)}</span></div>)}</div><div className="mt-6 flex justify-between border-t pt-5 text-lg font-extrabold"><span>Total</span><span className="text-primary">{formatIDR(order.total_idr)}</span></div>{paid && <Button className="mt-6 h-12 w-full bg-info text-background hover:bg-info/90" onClick={downloadReceipt}><Download />Download Struk PDF</Button>}</section><p className="mt-6 text-center text-xs text-muted-foreground">Halaman diperbarui otomatis setiap beberapa detik.</p></div></main>;
}