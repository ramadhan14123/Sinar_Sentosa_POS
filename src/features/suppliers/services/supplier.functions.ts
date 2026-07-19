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

export const getSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, "owner");
    const { data, error } = await (context.supabase as any)
      .from("suppliers")
      .select("*")
      .order("name");
    if (error) throw new Error("Gagal memuat supplier.");
    return data as any;
  });

export const saveSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(100),
        phone: z.string().max(50).nullable().optional(),
        email: z.string().email().max(100).nullable().optional(),
        address: z.string().max(500).nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { id, ...values } = data;
    const query = id
      ? (context.supabase as any).from("suppliers").update(values).eq("id", id)
      : (context.supabase as any).from("suppliers").insert(values);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { error } = await (context.supabase as any).from("suppliers").delete().eq("id", data.id);
    if (error) {
      if (error.code === "23503") {
        throw new Error("Supplier tidak dapat dihapus karena sudah memiliki histori pembelian.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });
