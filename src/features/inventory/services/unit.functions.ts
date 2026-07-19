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

export const getUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, "owner");
    const { data, error } = await (context.supabase as any).from("units").select("*").order("name");
    if (error) throw new Error("Gagal memuat satuan.");
    return data as any;
  });

export const saveUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(50),
        symbol: z.string().min(1).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { id, ...values } = data;
    const query = id
      ? (context.supabase as any).from("units").update(values).eq("id", id)
      : (context.supabase as any).from("units").insert(values);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { error } = await (context.supabase as any).from("units").delete().eq("id", data.id);
    if (error) {
      if (error.code === "23503") {
        throw new Error("Satuan tidak dapat dihapus karena sedang digunakan oleh bahan baku.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });
