import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMyRole } from "@/lib/pos.functions";

export const Route = createFileRoute("/app/")({
  loader: async () => {
    const { role } = await getMyRole();
    if (role === "owner") throw redirect({ to: "/owner" });
    throw redirect({ to: "/cashier/pos" });
  },
});
