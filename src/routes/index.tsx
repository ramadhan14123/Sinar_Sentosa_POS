import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Minus, Plus, Search, ShoppingBag, Sparkles, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR } from "@/lib/format";
import { catalogQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Menu Hari Ini — RasaPOS" },
      { name: "description", content: "Pilih menu favorit, pesan, dan pantau statusnya langsung dari perangkat Anda." },
      { property: "og:title", content: "Menu Hari Ini — RasaPOS" },
      { property: "og:description", content: "Pilih menu favorit dan pesan dengan mudah." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  errorComponent: () => <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="text-2xl font-bold">Katalog belum tersedia</h1><p className="mt-2 text-muted-foreground">Silakan muat ulang beberapa saat lagi.</p></div></div>,
  notFoundComponent: () => <div>Menu tidak ditemukan.</div>,
  component: Index,
});

function Index() {
  const { data } = useSuspenseQuery(catalogQuery);
  const navigate = useNavigate();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const filtered = useMemo(() => data.products.filter((p) => (category === "all" || p.category_id === category) && p.name.toLowerCase().includes(query.toLowerCase())), [data.products, category, query]);
  const productSections = useMemo(() => {
    if (category !== "all") return [{ id: category, name: "", products: filtered }];
    const categoryIds = new Set(data.categories.map((item) => item.id));
    const sections = data.categories.map((item) => ({
      id: item.id,
      name: item.name,
      products: filtered.filter((product) => product.category_id === item.id),
    }));
    const uncategorized = filtered.filter((product) => !product.category_id || !categoryIds.has(product.category_id));
    if (uncategorized.length) sections.push({ id: "other", name: "Lainnya", products: uncategorized });
    return sections.filter((section) => section.products.length > 0);
  }, [category, data.categories, filtered]);
  const items = data.products.filter((p) => cart[p.id]).map((p) => ({ ...p, quantity: cart[p.id] }));
  const total = items.reduce((sum, item) => sum + item.price_idr * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  function update(id: string, amount: number, max: number) { setCart((old) => ({ ...old, [id]: Math.max(0, Math.min(max, (old[id] ?? 0) + amount)) })); }
  async function checkout() {
    if (name.trim().length < 2) return toast.error("Isi nama pemesan minimal 2 karakter.");
    if (!items.length) return toast.error("Keranjang masih kosong.");
    setSubmitting(true);
    const { data: result, error } = await supabase.rpc("create_order", { p_customer_name: name.trim(), p_items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })) });
    setSubmitting(false);
    if (error || !result || typeof result !== "object" || Array.isArray(result)) return toast.error(error?.message ?? "Pesanan gagal dibuat.");
    const code = String(result.order_code); const token = String(result.tracking_token);
    localStorage.setItem(`order-token:${code}`, token);
    await navigate({ to: "/order/$code", params: { code } });
  }
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8"><Brand /><Sheet><SheetTrigger asChild><Button className="relative shadow-color"><ShoppingBag />Keranjang{count > 0 && <span className="grid size-5 place-items-center rounded-full bg-background text-[10px] text-primary">{count}</span>}</Button></SheetTrigger><CartSheet items={items} total={total} name={name} setName={setName} update={update} checkout={checkout} submitting={submitting} /></Sheet></div></header>
      <main>
        <section className="border-b bg-background"><div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-8 lg:grid-cols-[1fr_420px] lg:items-end lg:py-16"><div><h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">Makanan enak,<br/><span className="text-primary">tinggal pilih & pesan.</span></h1><p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">Pilih favoritmu, masukkan nama, lalu bayar di kasir. Kami akan menyiapkannya selagi hangat.</p></div><div className="relative"><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari makanan atau minuman..." className="h-14 rounded-2xl bg-surface pl-12 text-base shadow-sm" /></div></div></section>
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8"><div className="mb-7 flex gap-2 overflow-x-auto pb-2"><Button variant={category === "all" ? "default" : "outline"} onClick={() => setCategory("all")} className="rounded-full">Semua menu</Button>{data.categories.map((c) => <Button key={c.id} variant={category === c.id ? "default" : "outline"} onClick={() => setCategory(c.id)} className="rounded-full">{c.name}</Button>)}</div>
          {filtered.length ? <div className={category === "all" ? "space-y-10" : ""}>{productSections.map((section, sectionIndex) => <section key={section.id} className={category === "all" && sectionIndex > 0 ? "border-t pt-8" : ""}>{category === "all" && <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:mb-5"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Kategori</p><h2 className="truncate font-display text-xl font-extrabold sm:text-2xl">{section.name}</h2></div><span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{section.products.length} menu</span></div>}<div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">{section.products.map((p) => { const quantity = cart[p.id] ?? 0; return <article key={p.id} className="group grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl border bg-background p-3 shadow-sm transition hover:shadow-lg sm:flex sm:flex-col sm:items-stretch sm:gap-0 sm:p-0 sm:hover:-translate-y-1"><div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-primary-soft sm:aspect-square sm:size-auto sm:rounded-none">{p.image_url ? <img src={p.image_url} alt={p.name} className="size-full object-cover" loading="lazy" /> : <div className="grid size-full place-items-center"><Utensils className="size-8 text-primary/35 sm:size-12" /></div>}{p.stock === 0 && <div className="absolute inset-0 grid place-items-center bg-foreground/65"><span className="rotate-[-8deg] rounded border border-background px-1.5 py-1 text-[10px] font-extrabold text-background sm:rounded-lg sm:border-2 sm:px-4 sm:py-2 sm:font-display sm:text-xl">HABIS</span></div>}<span className="absolute left-1.5 top-1.5 rounded-full bg-background/90 px-1.5 py-0.5 text-[10px] font-bold shadow-sm sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">Stok {p.stock}</span></div><div className="min-w-0 sm:px-4 sm:pt-4"><h3 className="truncate font-display text-sm font-bold sm:text-lg">{p.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground sm:min-h-10 sm:text-sm sm:leading-5">{p.description || "Disiapkan segar untuk pesanan Anda."}</p></div><div className="flex shrink-0 flex-col items-end gap-2 sm:mt-auto sm:flex-row sm:items-center sm:justify-between sm:p-4"><span className="whitespace-nowrap font-display text-xs font-bold text-primary sm:text-base">{formatIDR(p.price_idr)}</span>{quantity > 0 ? <div className="flex items-center gap-1"><Button size="icon" variant="outline" className="size-7 sm:size-9" onClick={() => update(p.id, -1, p.stock)} aria-label={`Kurangi ${p.name}`}><Minus /></Button><span className="w-5 text-center text-sm font-bold" aria-label={`Jumlah ${p.name}`}>{quantity}</span><Button size="icon" className="size-7 sm:size-9" disabled={quantity >= p.stock} onClick={() => update(p.id, 1, p.stock)} aria-label={`Tambah ${p.name}`}><Plus /></Button></div> : <Button size="icon" className="size-8 sm:size-9" disabled={p.stock === 0} onClick={() => update(p.id, 1, p.stock)} aria-label={`Tambah ${p.name}`}><Plus /></Button>}</div></article>; })}</div></section>)}</div> : <div className="py-20 text-center"><Utensils className="mx-auto size-10 text-muted-foreground"/><h2 className="mt-4 text-xl font-bold">Menu belum tersedia</h2><p className="text-muted-foreground">Coba kategori atau kata pencarian lain.</p></div>}
        </section>
      </main>
    </div>
  );
}

function CartSheet({ items, total, name, setName, update, checkout, submitting }: any) {
  return <SheetContent className="flex w-full flex-col sm:max-w-md"><SheetHeader><SheetTitle className="font-display text-2xl">Pesanan kamu</SheetTitle><SheetDescription>Periksa kembali pilihan sebelum memesan.</SheetDescription></SheetHeader><div className="mt-6 flex-1 space-y-4 overflow-y-auto">{items.length ? items.map((item: any) => <div key={item.id} className="flex items-center gap-3 border-b pb-4"><div className="grid size-14 place-items-center overflow-hidden rounded-xl bg-primary-soft">{item.image_url ? <img src={item.image_url} alt="" className="size-full object-cover" /> : <Utensils className="text-primary" />}</div><div className="min-w-0 flex-1"><p className="truncate font-bold">{item.name}</p><p className="text-sm text-primary">{formatIDR(item.price_idr)}</p></div><div className="flex items-center gap-2"><Button size="icon" variant="outline" className="size-8" onClick={() => update(item.id, -1, item.stock)}><Minus /></Button><span className="w-5 text-center font-bold">{item.quantity}</span><Button size="icon" variant="outline" className="size-8" onClick={() => update(item.id, 1, item.stock)}><Plus /></Button></div></div>) : <p className="py-10 text-center text-muted-foreground">Belum ada menu di keranjang.</p>}</div><div className="space-y-4 border-t pt-5"><div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary">{formatIDR(total)}</span></div><div><label htmlFor="customer-name" className="mb-2 block text-sm font-bold">Atas Nama</label><Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Contoh: Budi" className="h-11" /></div><Button className="h-12 w-full text-base shadow-color" onClick={checkout} disabled={submitting || !items.length}>{submitting ? "Membuat pesanan..." : "Pesan sekarang"}</Button></div></SheetContent>;
}
