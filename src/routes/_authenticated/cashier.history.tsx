import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/shared/layouts/AppShell";
import { OrderHistoryList } from "@/features/cashier/components/OrderHistoryList";
import { Button } from "@/shared/components/ui/button";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { useRole } from "@/shared/hooks/use-role";
import { getOrdersHistory, deleteOrder } from "@/features/cashier/services/cashier.functions";

export const Route = createFileRoute("/_authenticated/cashier/history")({
  component: OrderHistoryPage,
});

type StatusFilter = "completed" | "cancelled" | undefined;
const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: undefined, label: "Semua" },
  { key: "completed", label: "Selesai" },
  { key: "cancelled", label: "Dibatalkan" },
];

function OrderHistoryPage() {
  const queryClient = useQueryClient();
  const role = useRole();
  const userRole = role.data?.role === "owner" ? "owner" : "cashier";
  const fetchHistory = useServerFn(getOrdersHistory);
  const deleteOrderFn = useServerFn(deleteOrder);

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

  const handleDelete = async (id: string) => {
    try {
      await deleteOrderFn({ data: { orderId: id } });
      toast.success("Pesanan berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["orders-history"] });
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus pesanan");
    }
  };

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
          onDelete={handleDelete}
        />
      </div>
    </AppShell>
  );
}
