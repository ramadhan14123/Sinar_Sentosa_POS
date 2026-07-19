import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cashier")({ component: CashierLayout });

function CashierLayout() {
  return <Outlet />;
}
