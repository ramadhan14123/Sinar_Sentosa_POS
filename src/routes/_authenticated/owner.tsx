import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/owner")({
  component: OwnerLayout,
});

function OwnerLayout() {
  return <Outlet />;
}