import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { OrderHistoryList } from "@/components/order-history-list";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useRole } from "@/hooks/use-role";
import { getOrdersHistory } from "@/lib/pos.functions";

export const Route = createFileRoute("/_authenticated/cashier/history")({ component: OrderHistoryPage });

type StatusFilter = "completed" | "cancelled" | undefined;
const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: undefined, label: "Semua" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Dibatalkan" },
];

function OrderHistoryPage() {
  const role = useRole();
  const userRole = role.data?.role === "owner" ? "owner" : "cashier";
  const fetchHistory = useServerFn(getOrdersHistory);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>(undefined);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const history = useQuery({
    queryKey: ["orders-history", page, status, debouncedSearch],
    queryFn: () =>
      fetchHistory({
        data: {
          page,
          pageSize: 20,
          status,
          search: debouncedSearch || undefined,
        },
      }),
  });

  const data = history.data;

  return (
    <AppShell role={userRole} eyebrow="Riwayat" title="Riwayat Pesanan">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.label}
              variant={status === f.key ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => {
                setStatus(f.key);
                setPage(1);
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <OrderHistoryList
          orders={data?.orders ?? []}
          total={data?.total ?? 0}
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          isLoading={history.isPending}
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          onPageChange={setPage}
        />
      </div>
    </AppShell>
  );
}
