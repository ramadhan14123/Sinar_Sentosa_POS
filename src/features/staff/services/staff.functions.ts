import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertRole(context: { supabase: any; userId: string }, role: "owner" | "cashier") {
  const { data, error } = await (context.supabase as any).rpc("has_role", {
    _user_id: context.userId,
    _role: role,
  });
  if (error || !data) throw new Error("Anda tidak memiliki akses untuk tindakan ini.");
}

export const createCashier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        fullName: z.string().trim().min(2).max(100),
        email: z.string().email().max(255),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Gagal membuat akun.");
    const { error: profileError } = await (supabaseAdmin as any)
      .from("profiles")
      .insert({ id: created.user.id, full_name: data.fullName });
    const { error: roleError } = await (supabaseAdmin as any)
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "cashier" });
    if (profileError || roleError)
      throw new Error(profileError?.message ?? roleError?.message ?? "Gagal menyimpan profil.");
    return { ok: true };
  });

export const deleteCashier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: roleError } = await (supabaseAdmin as any)
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (roleError) throw new Error(roleError.message);
    const { error: profileError } = await (supabaseAdmin as any)
      .from("profiles")
      .delete()
      .eq("id", data.userId);
    if (profileError) throw new Error(profileError.message);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (authError) throw new Error(authError.message);
    return { ok: true };
  });

export const getStaffWithEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, "owner");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error: roleError } = await (supabaseAdmin as any)
      .from("user_roles")
      .select("user_id")
      .eq("role", "cashier");
    if (roleError) throw new Error(roleError.message);
    const ids = roles.map((r: any) => r.user_id);
    if (!ids.length) return [];
    const { data: profiles, error: profileError } = await (supabaseAdmin as any)
      .from("profiles")
      .select("*")
      .in("id", ids);
    if (profileError) throw new Error(profileError.message);
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw new Error(authError.message);
    const emailMap = new Map(authUsers.users.map((u) => [u.id, u.email]));
    return (profiles ?? []).map((p: any) => ({ ...p, email: emailMap.get(p.id) ?? "-" }));
  });
