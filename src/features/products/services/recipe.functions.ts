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

export const getProductRecipes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ productId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { data: recipes, error } = await (context.supabase as any)
      .from("product_recipes")
      .select("*, ingredient:ingredients(name, unit:units(symbol))")
      .eq("product_id", data.productId);
    if (error) throw new Error("Gagal memuat resep.");
    return recipes;
  });

export const saveProductRecipes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        productId: z.string().uuid(),
        recipes: z.array(
          z.object({
            ingredient_id: z.string().uuid(),
            quantity: z.number().positive(),
          }),
        ),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Hapus resep lama
    await (supabaseAdmin as any).from("product_recipes").delete().eq("product_id", data.productId);

    // Insert resep baru
    if (data.recipes.length > 0) {
      const inserts = data.recipes.map((r) => ({
        product_id: data.productId,
        ingredient_id: r.ingredient_id,
        quantity: r.quantity,
      }));
      const { error } = await (supabaseAdmin as any).from("product_recipes").insert(inserts);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });
