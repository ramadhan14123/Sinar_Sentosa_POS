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

export const getIngredients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, "owner");
    const { data, error } = await (context.supabase as any)
      .from("ingredients")
      .select("*, category:ingredient_categories(name), unit:units(name, symbol)")
      .order("name");
    if (error) throw new Error("Gagal memuat bahan baku.");
    return data as any;
  });

export const saveIngredient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(100),
        category_id: z.string().uuid(),
        unit_id: z.string().uuid(),
        sku: z.string().max(100).nullable().optional(),
        minimum_stock: z.number().min(0).default(0),
        is_active: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { id, ...values } = data;
    const query = id
      ? (context.supabase as any).from("ingredients").update(values).eq("id", id)
      : (context.supabase as any).from("ingredients").insert(values);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        ingredientId: z.string().uuid(),
        adjustmentType: z.enum(["adjustment", "waste", "return"]),
        quantity: z.number(),
        notes: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");

    // Using supabaseAdmin to bypass RLS for transactions
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Start a simple "transaction" like flow by querying current stock first
    const { data: ingredient, error: fetchErr } = await (supabaseAdmin as any)
      .from("ingredients")
      .select("current_stock")
      .eq("id", data.ingredientId)
      .single();

    if (fetchErr || !ingredient) throw new Error("Bahan baku tidak ditemukan.");

    const stockBefore = ingredient.current_stock;
    const stockAfter = stockBefore + data.quantity;

    if (stockAfter < 0) {
      throw new Error("Stok tidak boleh kurang dari 0.");
    }

    const { error: updateErr } = await (supabaseAdmin as any)
      .from("ingredients")
      .update({ current_stock: stockAfter })
      .eq("id", data.ingredientId);

    if (updateErr) throw new Error("Gagal mengupdate stok.");

    const { error: moveErr } = await (supabaseAdmin as any).from("stock_movements").insert({
      ingredient_id: data.ingredientId,
      movement_type: data.adjustmentType,
      quantity: data.quantity,
      stock_before: stockBefore,
      stock_after: stockAfter,
      reference_type: "manual",
      notes: data.notes,
      created_by: context.userId,
    });

    if (moveErr) throw new Error("Gagal mencatat histori stok.");
    return { ok: true };
  });

export const getIngredientCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, "owner");
    const { data, error } = await (context.supabase as any)
      .from("ingredient_categories")
      .select("*")
      .order("name");
    if (error) throw new Error("Gagal memuat kategori bahan baku.");
    return data as any;
  });

export const getStockMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ingredientId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { data: movements, error } = await (context.supabase as any)
      .from("stock_movements")
      .select("*, created_by_user:profiles(full_name)")
      .eq("ingredient_id", data.ingredientId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Gagal memuat histori stok.");
    return movements as any;
  });
