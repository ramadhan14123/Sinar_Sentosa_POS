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

const productSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
  price_idr: z.number().int().positive().max(100_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  image_url: z.string().max(1000).nullable(),
  is_active: z.boolean(),
});

export const updateStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ productId: z.string().uuid(), stock: z.number().int().min(0).max(1_000_000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed } = await (context.supabase as any).rpc("is_staff", {
      _user_id: context.userId,
    });
    if (!allowed) throw new Error("Akses ditolak.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("products")
      .update({ stock: data.stock })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { id, ...values } = data;
    const query = id
      ? (context.supabase as any).from("products").update(values).eq("id", id)
      : (context.supabase as any).from("products").insert(values);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { error } = await (context.supabase as any).from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
