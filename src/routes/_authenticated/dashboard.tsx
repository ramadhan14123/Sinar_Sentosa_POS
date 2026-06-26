import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMyRole } from "@/lib/pos.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: async () => { const { role } = await getMyRole(); throw redirect({ to: role === "owner" ? "/owner" : "/cashier" }); },
});