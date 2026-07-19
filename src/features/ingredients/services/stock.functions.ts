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

export const getStockMovements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        ingredientId: z.string().uuid(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    // @ts-ignore
    const {
      data: movements,
      count,
      error,
    } = await (context.supabase as any)
      .from("stock_movements")
      .select("*, profile:profiles(full_name)", { count: "exact" })
      .eq("ingredient_id", data.ingredientId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error("Gagal memuat pergerakan stok.");

    return {
      movements,
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.ceil((count ?? 0) / data.pageSize),
    };
  });
