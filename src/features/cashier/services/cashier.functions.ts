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

export const getStaffOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Gagal memuat antrean pesanan.");
    return data;
  });

export const getOrdersHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        status: z.enum(["completed", "cancelled"]).optional(),
        search: z.string().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let query = (context.supabase as any)
      .from("orders")
      .select("*, order_items(*)", { count: "exact" })
      .not("status", "in", '("pending_payment","confirmed","processing")');

    if (data.status) query = query.eq("status", data.status);
    if (data.search) {
      const s = `%${data.search}%`;
      query = query.or(`customer_name.ilike.${s},order_code.ilike.${s}`);
    }

    const {
      data: orders,
      count,
      error,
    } = await query.order("created_at", { ascending: false }).range(from, to);

    if (error) throw new Error("Gagal memuat riwayat pesanan.");
    return {
      orders,
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.ceil((count ?? 0) / data.pageSize),
    };
  });

export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ orderId: z.string().uuid(), amountReceived: z.number().int().min(0).default(0) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("confirm_order_payment", {
      p_order_id: data.orderId,
      p_amount_received: data.amountReceived,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const changeOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(["processing", "completed", "cancelled"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).rpc("update_order_status", {
      p_order_id: data.orderId,
      p_new_status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getOrderById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await (context.supabase as any)
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("Pesanan tidak ditemukan.");
    return order as Record<string, any>;
  });
