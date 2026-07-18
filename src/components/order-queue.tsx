import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  CheckCircle2,
  ChefHat,
  Printer,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  Search,
  User2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import {
  confirmPayment,
  changeOrderStatus,
  getOrderById,
  getStaffOrders,
} from "@/lib/pos.functions";
import { getStoreSettings } from "@/lib/settings.functions";
import { printReceipt } from "@/lib/print";
import { supabase } from "@/integrations/supabase/client";
import type { StoreSettings } from "@/lib/print/types";
import { useActionGuard } from "@/hooks/use-action-guard";
import { formatDateTime, formatIDR } from "@/lib/format";

type StatusKey = "pending_payment" | "confirmed" | "processing";

const TABS: { key: StatusKey | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pending_payment", label: "Menunggu bayar" },
  { key: "confirmed", label: "Dikonfirmasi" },
  { key: "processing", label: "Diproses" },
];

const STATUS_META: Record<StatusKey, { label: string; chip: string; dot: string }> = {
  pending_payment: {
    label: "Menunggu bayar",
    chip: "bg-warning-soft text-warning",
    dot: "bg-warning",
  },
  confirmed: { label: "Dikonfirmasi", chip: "bg-info-soft text-info", dot: "bg-info" },
  processing: { label: "Diproses", chip: "bg-success-soft text-success", dot: "bg-success" },
};

function nextAction(status: StatusKey) {
  if (status === "pending_payment") return { label: "Konfirmasi bayar", Icon: CircleDollarSign };
  if (status === "confirmed") return { label: "Mulai proses", Icon: ChefHat };
  return { label: "Selesaikan", Icon: ReceiptText };
}

export function OrderQueue() {
  const fetchOrders = useServerFn(getStaffOrders);
  const confirm = useServerFn(confirmPayment);
  const change = useServerFn(changeOrderStatus);
  const query = useQuery({
    queryKey: ["staff-orders"],
    queryFn: () => fetchOrders(),
    refetchInterval: 5000,
  });
  const [tab, setTab] = useState<StatusKey | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [cashAmounts, setCashAmounts] = useState<Record<string, string>>({});
  const { saving: printing, guard: guardPrint } = useActionGuard();

  const active = useMemo(
    () => (query.data ?? []).filter((o) => !["completed", "cancelled"].includes(o.status)) as any[],
    [query.data],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: active.length,
      pending_payment: 0,
      confirmed: 0,
      processing: 0,
    };
    active.forEach((o) => {
      c[o.status] = (c[o.status] ?? 0) + 1;
    });
    return c;
  }, [active]);
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return active
      .filter((o) => (tab === "all" ? true : o.status === tab))
      .filter(
        (o) =>
          !q ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.order_code?.toLowerCase().includes(q),
      )
      .slice()
      .sort((a, b) => {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return sortDir === "asc" ? da - db : db - da;
      });
  }, [active, tab, search, sortDir]);

  async function act(o: any) {
    setBusyId(o.id);
    try {
      if (o.status === "pending_payment") {
        const amt = Math.max(Number(cashAmounts[o.id]) || 0, o.total_idr);
        await confirm({ data: { orderId: o.id, amountReceived: amt } });
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        const [orderData, storeData, profileResult] = await Promise.all([
          getOrderById({ data: { orderId: o.id } }),
          getStoreSettings(),
          userId
            ? supabase.from("profiles").select("full_name").eq("id", userId).single()
            : Promise.resolve({ data: null }),
        ]);
        const cashierName = profileResult?.data?.full_name ?? "Kasir";

        const printResult = await printReceipt(orderData as Record<string, any>, storeData as StoreSettings, cashierName);
        if (printResult === "thermal") toast.success("Struk sedang dicetak.");
        else if (printResult === "pdf")
          toast.info("Printer tidak tersedia. Pelanggan dapat mengunduh struk.");
      } else
        await change({
          data: { orderId: o.id, status: o.status === "confirmed" ? "processing" : "completed" },
        });
      toast.success("Status pesanan diperbarui.");
      await query.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tindakan gagal.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReprint(o: any) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    const [orderData, storeData, profileResult] = await Promise.all([
      getOrderById({ data: { orderId: o.id } }),
      getStoreSettings(),
      userId
        ? supabase.from("profiles").select("full_name").eq("id", userId).single()
        : Promise.resolve({ data: null }),
    ]);
    const cashierName = profileResult?.data?.full_name ?? "Kasir";

    const printResult = await printReceipt(orderData as Record<string, any>, storeData as StoreSettings, cashierName);
    if (printResult === "thermal") toast.success("Struk sedang dicetak.");
    else if (printResult === "pdf")
      toast.info("Printer tidak tersedia. Pelanggan dapat mengunduh struk.");
  }

  if (query.isLoading) {
    return (
      <div className="grid min-h-64 place-items-center">
        <Clock3 className="animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama pelanggan atau kode pesanan…"
            className="h-10 pl-9 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Bersihkan pencarian"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-bold text-foreground hover:bg-muted"
          title="Urutkan berdasarkan waktu masuk"
        >
          {sortDir === "asc" ? (
            <ArrowUpNarrowWide className="size-4" />
          ) : (
            <ArrowDownWideNarrow className="size-4" />
          )}
          {sortDir === "asc" ? "Terlama dulu" : "Terbaru dulu"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const isActive = tab === t.key;
          const n = counts[t.key] ?? 0;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  isActive ? "bg-primary-foreground/20" : "bg-muted text-foreground",
                )}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-background py-16 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <h2 className="mt-4 text-xl font-bold">Antrean sudah bersih</h2>
          <p className="text-muted-foreground">Pesanan baru akan muncul otomatis di sini.</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
          {list.map((o, i) => {
            const meta = STATUS_META[o.status as StatusKey];
            const action = nextAction(o.status as StatusKey);
            const itemCount = o.order_items.reduce((s: number, it: any) => s + it.quantity, 0);
            const isOpen = expanded === o.id;
            const isBusy = busyId === o.id;
            return (
              <li key={o.id} className={cn("group", i > 0 && "border-t border-border/60")}>
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-5">
                  <span
                    className={cn("hidden size-2.5 rounded-full sm:block", meta.dot)}
                    aria-hidden
                  />
                  <button
                    onClick={() => setExpanded(isOpen ? null : o.id)}
                    className="flex min-w-0 items-center gap-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-display text-base font-extrabold tracking-tight">
                          {o.order_code}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            meta.chip,
                          )}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <User2 className="size-3.5" />
                        <span className="truncate">{o.customer_name}</span>
                        <span aria-hidden>•</span>
                        <span className="whitespace-nowrap">{itemCount} item</span>
                        <span aria-hidden className="hidden sm:inline">
                          •
                        </span>
                        <span className="hidden whitespace-nowrap sm:inline">
                          {formatDateTime(o.created_at)}
                        </span>
                      </div>
                    </div>
                    <span className="hidden text-right md:block">
                      <span className="block font-display text-base font-extrabold text-primary">
                        {formatIDR(o.total_idr)}
                      </span>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Total
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  <Button
                    size="sm"
                    disabled={isBusy}
                    className={cn(
                      "shrink-0",
                      o.status === "confirmed" && "bg-info hover:bg-info/90",
                      o.status === "processing" && "bg-success hover:bg-success/90",
                    )}
                    onClick={() => act(o)}
                  >
                    <action.Icon />
                    <span className="hidden sm:inline">{action.label}</span>
                  </Button>
                </div>
                {isOpen && (
                  <div className="border-t border-border/60 bg-muted/30 px-4 py-3 sm:px-5">
                    <div className="grid gap-1.5 text-sm">
                      {o.order_items.map((it: any) => (
                        <div key={it.id} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate">
                            <strong className="text-primary">{it.quantity}×</strong>{" "}
                            {it.product_name_snapshot}
                          </span>
                          <span className="text-muted-foreground">{formatIDR(it.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 md:hidden">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Total
                      </span>
                      <span className="font-display text-base font-extrabold text-primary">
                        {formatIDR(o.total_idr)}
                      </span>
                    </div>
                    {o.status === "pending_payment" && (
                      <div className="mt-3 flex items-center gap-3 border-t border-border/60 pt-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                          Uang Diterima
                        </label>
                        <Input
                          type="number"
                          min={o.total_idr}
                          value={cashAmounts[o.id] ?? ""}
                          onChange={(e) =>
                            setCashAmounts((prev) => ({ ...prev, [o.id]: e.target.value }))
                          }
                          placeholder={o.total_idr.toLocaleString("id-ID")}
                          className="h-9 w-40 rounded-lg text-sm"
                        />
                        {Number(cashAmounts[o.id]) >= o.total_idr && (
                          <span className="text-xs font-semibold text-green-600">
                            Kembali: {formatIDR(Number(cashAmounts[o.id]) - o.total_idr)}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex justify-end pt-2">
                      <Button size="sm" variant="outline" disabled={printing} onClick={() => guardPrint(async () => { await handleReprint(o); })}>
                        <Printer className="size-4" /> Cetak Struk
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
