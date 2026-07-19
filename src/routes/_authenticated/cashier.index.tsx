import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/layouts/AppShell";
import { OrderQueue } from "@/features/cashier/components/OrderQueue";
import { useRole } from "@/shared/hooks/use-role";

export const Route = createFileRoute("/_authenticated/cashier/")({ component: CashierPage });

function CashierPage() {
  const { data } = useRole();
  return (
    <AppShell
      role={data?.role === "owner" ? "owner" : "cashier"}
      eyebrow="Operasional"
      title="Antrean Pesanan"
    >
      <OrderQueue />
    </AppShell>
  );
}
