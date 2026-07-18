import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Minus, Plus, Search, ShoppingBag, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRole } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR } from "@/lib/format";
import { confirmPayment, getOrderById } from "@/lib/pos.functions";
import { getStoreSettings } from "@/lib/settings.functions";
import { catalogQuery } from "@/lib/queries";
import { printReceipt } from "@/lib/print";
import type { StoreSettings } from "@/lib/print/types";

export const Route = createFileRoute("/_authenticated/cashier/pos")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  component: CashierPosPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-destructive">
            Gagal memuat
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold">
            Halaman Buat Pesanan tidak dapat dimuat
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-color"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <p className="text-sm text-muted-foreground">Halaman tidak ditemukan.</p>
    </div>
  ),
});

function CashierPosPage() {
  const { data } = useSuspenseQuery(catalogQuery);
  const role = useRole();
  const queryClient = useQueryClient();
  const confirm = useServerFn(confirmPayment);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [cashReceived, setCashReceived] = useState("");

  const filtered = useMemo(
    () =>
      data.products.filter(
        (p) =>
          (category === "all" || p.category_id === category) &&
          p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [data.products, category, query],
  );
  const sections = useMemo(() => {
    if (category !== "all") return [{ id: category, name: "", products: filtered }];
    const ids = new Set(data.categories.map((c) => c.id));
    const out = data.categories.map((c) => ({
      id: c.id,
      name: c.name,
      products: filtered.filter((p) => p.category_id === c.id),
    }));
    const other = filtered.filter((p) => !p.category_id || !ids.has(p.category_id));
    if (other.length) out.push({ id: "other", name: "Lainnya", products: other });
    return out.filter((s) => s.products.length > 0);
  }, [category, data.categories, filtered]);

  const items = data.products
    .filter((p) => cart[p.id])
    .map((p) => ({ ...p, quantity: cart[p.id] }));
  const total = items.reduce((s, i) => s + i.price_idr * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  function update(id: string, amount: number, max: number) {
    setCart((old) => ({ ...old, [id]: Math.max(0, Math.min(max, (old[id] ?? 0) + amount)) }));
  }

  async function submit() {
    if (name.trim().length < 2) return toast.error("Isi nama pelanggan minimal 2 karakter.");
    if (!items.length) return toast.error("Keranjang masih kosong.");
    if (!cashReceived || Number(cashReceived) < total)
      return toast.error("Uang diterima kurang dari total.");
    setSubmitting(true);
    try {
      const { data: result, error } = await supabase.rpc("create_order", {
        p_customer_name: name.trim(),
        p_items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      });
      if (error || !result || typeof result !== "object" || Array.isArray(result))
        throw new Error(error?.message ?? "Pesanan gagal dibuat.");
      const orderId = String((result as Record<string, unknown>).order_id);
      await confirm({ data: { orderId, amountReceived: Number(cashReceived) } });

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const [orderData, storeData, profileResult] = await Promise.all([
        getOrderById({ data: { orderId } }),
        getStoreSettings(),
        userId
          ? supabase.from("profiles").select("full_name").eq("id", userId).single()
          : Promise.resolve({ data: null }),
      ]);
      const cashierName = profileResult?.data?.full_name ?? "Kasir";

      const printResult = await printReceipt(orderData as Record<string, any>, storeData as StoreSettings, cashierName);
      if (printResult === "thermal") {
        toast.success("Struk sedang dicetak.");
      } else if (printResult === "pdf") {
        toast.info("Printer tidak tersedia. Pelanggan dapat mengunduh struk secara mandiri.");
      }
      toast.success(
        `Pesanan ${String((result as Record<string, unknown>).order_code)} dibuat & dibayar.`,
      );
      setCart({});
      setName("");
      setCashReceived("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-orders"] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pesanan gagal dibuat.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      role={role.data?.role === "owner" ? "owner" : "cashier"}
      eyebrow="Kasir"
      title="Buat Pesanan"
    >
      <div className="grid gap-6 pb-28 lg:grid-cols-[1fr_380px] lg:pb-0">
        <div>
          <div className="relative mb-5 max-w-2xl">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari menu..."
              className="h-12 rounded-2xl border-border/60 bg-background pl-12 shadow-sm"
            />
          </div>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={category === "all" ? "default" : "outline"}
              onClick={() => setCategory("all")}
              className="rounded-full px-5"
              size="sm"
            >
              Semua
            </Button>
            {data.categories.map((c) => (
              <Button
                key={c.id}
                variant={category === c.id ? "default" : "outline"}
                onClick={() => setCategory(c.id)}
                className="rounded-full px-5"
                size="sm"
              >
                {c.name}
              </Button>
            ))}
          </div>
          {sections.length ? (
            <div className="space-y-10">
              {sections.map((section, idx) => (
                <section key={section.id}>
                  {category === "all" && section.name && (
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h2 className="font-display text-xl font-extrabold">{section.name}</h2>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                        {section.products.length} menu
                      </span>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-1 xl:grid-cols-2">
                    {section.products.map((p) => {
                      const qty = cart[p.id] ?? 0;
                      return (
                        <article
                          key={p.id}
                          className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-transparent bg-background p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:border-primary/10 hover:shadow-md"
                        >
                          <div className="relative size-20 overflow-hidden rounded-xl bg-primary-soft">
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="size-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="grid size-full place-items-center">
                                <Utensils className="size-7 text-primary/40" />
                              </div>
                            )}
                            {p.stock === 0 && (
                              <div className="absolute inset-0 grid place-items-center bg-foreground/60">
                                <span className="text-[10px] font-bold text-background">HABIS</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-base font-bold">{p.name}</h3>
                            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                              Stok {p.stock}
                            </p>
                            <p className="mt-1 font-display text-lg font-bold text-primary">
                              {formatIDR(p.price_idr)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {qty > 0 ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="size-10 rounded-xl"
                                  onClick={() => update(p.id, -1, p.stock)}
                                  aria-label="Kurangi"
                                >
                                  <Minus />
                                </Button>
                                <span className="w-6 text-center font-display text-base font-bold">
                                  {qty}
                                </span>
                                <Button
                                  size="icon"
                                  className="size-10 rounded-xl shadow-color"
                                  disabled={qty >= p.stock}
                                  onClick={() => update(p.id, 1, p.stock)}
                                  aria-label="Tambah"
                                >
                                  <Plus />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="icon"
                                className="size-11 rounded-xl shadow-color"
                                disabled={p.stock === 0}
                                onClick={() => update(p.id, 1, p.stock)}
                                aria-label="Tambah"
                              >
                                <Plus />
                              </Button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
              Menu tidak ditemukan.
            </div>
          )}
        </div>

        {/* Desktop cart */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl border border-border/60 bg-background p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)]">
            <CartContent
              items={items}
              total={total}
              name={name}
              setName={setName}
              cashReceived={cashReceived}
              setCashReceived={setCashReceived}
              update={update}
              submit={submit}
              submitting={submitting}
            />
          </div>
        </aside>
      </div>

      {/* Mobile floating cart */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-20 px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="h-14 w-full justify-between rounded-2xl shadow-color" size="lg">
                <span className="flex items-center gap-2 font-bold">
                  <ShoppingBag className="size-4" />
                  {count} item
                </span>
                <span className="font-display font-bold">{formatIDR(total)}</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">Keranjang kasir</SheetTitle>
                <SheetDescription>Periksa item sebelum konfirmasi pembayaran.</SheetDescription>
              </SheetHeader>
              <div className="mt-4 flex-1 overflow-y-auto">
                <CartContent
                  items={items}
                  total={total}
                  name={name}
                  setName={setName}
                  cashReceived={cashReceived}
                  setCashReceived={setCashReceived}
                  update={update}
                  submit={submit}
                  submitting={submitting}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </AppShell>
  );
}

function CartContent({
  items,
  total,
  name,
  setName,
  cashReceived,
  setCashReceived,
  update,
  submit,
  submitting,
}: {
  items: any[];
  total: number;
  name: string;
  setName: (v: string) => void;
  cashReceived: string;
  setCashReceived: (v: string) => void;
  update: (id: string, amt: number, max: number) => void;
  submit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <h2 className="font-display text-xl font-extrabold">Pesanan baru</h2>
      <div className="mt-6 flex-1 overflow-y-auto">
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-border/60 pb-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{item.name}</p>
                  <p className="text-xs font-medium text-primary">{formatIDR(item.price_idr)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-lg"
                    onClick={() => update(item.id, -1, item.stock)}
                  >
                    <Minus />
                  </Button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-lg"
                    onClick={() => update(item.id, 1, item.stock)}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center opacity-70">
            <div className="grid size-16 place-items-center rounded-full bg-muted">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Belum ada item.</p>
          </div>
        )}
      </div>
      <div className="mt-6 space-y-5 border-t border-border/60 pt-5">
        <div className="flex items-end justify-between">
          <span className="text-sm font-bold">Total</span>
          <span className="font-display text-3xl font-extrabold text-primary">
            {formatIDR(total)}
          </span>
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="pos-cash"
            className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
          >
            Uang Diterima
          </label>
          <Input
            id="pos-cash"
            type="number"
            min={0}
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
            placeholder="0"
            className="h-11 rounded-xl border-border/60 bg-muted/40"
          />
          {Number(cashReceived) > 0 && Number(cashReceived) >= total && (
            <p className="text-sm font-semibold text-green-600">
              Kembalian: {formatIDR(Number(cashReceived) - total)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="pos-name"
            className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
          >
            Atas Nama
          </label>
          <Input
            id="pos-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Nama pelanggan"
            className="h-11 rounded-xl border-border/60 bg-muted/40"
          />
        </div>
        <Button
          className="h-12 w-full rounded-2xl text-base shadow-color"
          onClick={submit}
          disabled={submitting || !items.length}
        >
          {submitting ? "Memproses..." : "Buat & konfirmasi bayar"}
        </Button>
      </div>
    </div>
  );
}
