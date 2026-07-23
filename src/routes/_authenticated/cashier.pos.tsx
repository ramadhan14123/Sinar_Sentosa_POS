import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { AppShell } from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import { useRole } from "@/shared/hooks/use-role";
import { formatIDR } from "@/shared/utils/format";
import { catalogQuery } from "@/features/products/queries/product.queries";
import { usePosCart } from "@/features/cashier/hooks/usePosCart";
import { PosProductGrid } from "@/features/cashier/components/PosProductGrid";
import { PosCartSidebar } from "@/features/cashier/components/PosCartSidebar";

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

  const {
    cart,
    items,
    total,
    count,
    name,
    setName,
    cashReceived,
    setCashReceived,
    updateQuantity,
    submitOrder,
    submitting,
  } = usePosCart(data.products);

  return (
    <AppShell
      role={role.data?.role === "owner" ? "owner" : "cashier"}
      eyebrow="Kasir"
      title="Buat Pesanan"
    >
      <div className="grid gap-6 pb-28 lg:grid-cols-[1fr_380px] lg:pb-0">
        <PosProductGrid
          products={data.products}
          categories={data.categories}
          cart={cart}
          onUpdateQuantity={updateQuantity}
        />

        {/* Desktop cart */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 flex max-h-[calc(100dvh-10rem)] flex-col rounded-3xl border border-border/60 bg-background p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.08)]">
            <PosCartSidebar
              items={items}
              total={total}
              name={name}
              setName={setName}
              cashReceived={cashReceived}
              setCashReceived={setCashReceived}
              updateQuantity={updateQuantity}
              onSubmit={submitOrder}
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
            <SheetContent className="flex max-h-dvh w-full flex-col sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl">Keranjang kasir</SheetTitle>
                <SheetDescription>Periksa item sebelum konfirmasi pembayaran.</SheetDescription>
              </SheetHeader>
              <div className="mt-4 flex-1 min-h-0">
                <PosCartSidebar
                  items={items}
                  total={total}
                  name={name}
                  setName={setName}
                  cashReceived={cashReceived}
                  setCashReceived={setCashReceived}
                  updateQuantity={updateQuantity}
                  onSubmit={submitOrder}
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
