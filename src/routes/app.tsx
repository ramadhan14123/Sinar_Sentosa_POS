import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/pos.functions";

export const Route = createFileRoute("/app")({
  ssr: false,
  loader: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const { role } = await getMyRole();

    if (role === "owner") throw redirect({ to: "/owner" });
    throw redirect({ to: "/cashier/pos" });
  },
});
