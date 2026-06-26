import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { OrderQueue } from "@/components/order-queue";
import { useRole } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/cashier/")({ component: CashierPage });

function CashierPage() {
  const { data } = useRole();
  return (
    <AppShell role={data?.role === "owner" ? "owner" : "cashier"} eyebrow="Operasional" title="Antrean Pesanan">
      <OrderQueue />
    </AppShell>
  );
}