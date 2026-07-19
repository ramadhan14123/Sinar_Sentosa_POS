import { Clock3, Search, User2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination";
import { cn } from "@/shared/utils/cn";
import { formatDateTime, formatIDR } from "@/shared/utils/format";

type HistoryOrder = {
  id: string;
  order_code: string;
  customer_name: string;
  status: string;
  total_idr: number;
  created_at: string;
  order_items: Array<{
    quantity: number;
    product_name_snapshot: string;
    subtotal: number;
  }>;
};

type OrderHistoryListProps = {
  orders: HistoryOrder[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onPageChange: (page: number) => void;
};

const STATUS_META: Record<string, { label: string; chip: string }> = {
  completed: {
    label: "Selesai",
    chip: "bg-success-soft text-success",
  },
  cancelled: {
    label: "Dibatalkan",
    chip: "bg-destructive-soft text-destructive",
  },
};

export function OrderHistoryList({
  orders,
  total,
  page,
  totalPages,
  isLoading,
  search,
  onSearchChange,
  onPageChange,
}: OrderHistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari nama pelanggan atau kode pesanan…"
          className="h-10 pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border bg-background p-4">
              <div className="mb-2 h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-48 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <Clock3 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            {search ? "Pesanan tidak ditemukan." : "Belum ada riwayat pesanan."}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm">
          {orders.map((o, i) => {
            const meta = STATUS_META[o.status] ?? {
              label: o.status,
              chip: "bg-muted text-muted-foreground",
            };
            const itemCount = o.order_items.reduce((s, it) => s + it.quantity, 0);
            const isExpanded = expandedId === o.id;
            return (
              <li key={o.id} className={cn(i > 0 && "border-t border-border/60")}>
                <div 
                  className="flex items-center gap-4 px-4 py-3 sm:px-5 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : o.id)}
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
                      <span>{itemCount} item</span>
                      <span aria-hidden>•</span>
                      <span>{formatDateTime(o.created_at)}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-right flex flex-col items-end gap-1">
                    <span className="block font-display text-base font-extrabold text-primary">
                      {formatIDR(o.total_idr)}
                    </span>
                    <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </span>
                </div>
                
                {isExpanded && (
                  <div className="px-4 pb-3 sm:px-5">
                    <div className="rounded-lg bg-muted/30 border p-3">
                      <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Detail Pesanan</h4>
                      <ul className="space-y-1.5">
                        {o.order_items.map((item, idx) => (
                          <li key={idx} className="flex justify-between items-center text-sm">
                            <span className="font-medium">
                              {item.quantity}x <span className="text-muted-foreground font-normal">{item.product_name_snapshot}</span>
                            </span>
                            <span className="font-semibold text-primary">{formatIDR(item.subtotal)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-muted-foreground">
            {total} pesanan — halaman {page} dari {totalPages}
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className={cn(page <= 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} className="contents">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <PaginationItem>
                        <span className="flex h-9 w-9 items-center justify-center text-xs text-muted-foreground">
                          ...
                        </span>
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink isActive={p === page} onClick={() => onPageChange(p)}>
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  </span>
                ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className={cn(page >= totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
