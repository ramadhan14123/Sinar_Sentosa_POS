import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMyRole } from "@/features/auth/services/auth.functions";

export const Route = createFileRoute("/app/")({
  loader: async () => {
    const { role } = await getMyRole();
    if (role === "owner") throw redirect({ to: "/owner" });
    throw redirect({ to: "/cashier/pos" });
  },
});
