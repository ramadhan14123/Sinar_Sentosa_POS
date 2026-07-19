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

export const getPurchaseOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        status: z.enum(["draft", "completed", "cancelled"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let query = (context.supabase as any)
      .from("purchase_orders")
      .select("*, supplier:suppliers(name)", { count: "exact" });

    if (data.status) {
      query = query.eq("status", data.status);
    }

    const {
      data: orders,
      count,
      error,
    } = await query.order("created_at", { ascending: false }).range(from, to);

    if (error) throw new Error("Gagal memuat pembelian.");

    return {
      orders: orders as any,
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.ceil((count ?? 0) / data.pageSize),
    };
  });

export const getPurchaseOrderById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { data: order, error } = await (context.supabase as any)
      .from("purchase_orders")
      .select(
        "*, supplier:suppliers(*), items:purchase_order_items(*, ingredient:ingredients(name, unit:units(symbol)))",
      )
      .eq("id", data.orderId)
      .single();

    if (error || !order) throw new Error("Pembelian tidak ditemukan.");
    return order as any;
  });

export const savePurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        supplier_id: z.string().uuid(),
        invoice_number: z.string().min(1).max(100),
        purchase_date: z.string(), // ISO string
        notes: z.string().max(500).nullable().optional(),
        items: z
          .array(
            z.object({
              ingredient_id: z.string().uuid(),
              quantity: z.number().positive(),
              unit_cost: z.number().min(0),
            }),
          )
          .min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { id, items, ...header } = data;
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);

    let poId = id;

    if (id) {
      // Cek status harus draft
      const { data: existing, error: errExist } = await (supabaseAdmin as any)
        .from("purchase_orders")
        .select("status")
        .eq("id", id)
        .single();

      if (errExist || !existing) throw new Error("Purchase Order tidak ditemukan.");
      if (existing.status !== "draft") throw new Error("Hanya draft yang dapat diedit.");

      // Update header
      // @ts-ignore
      const { error: errHeader } = await (supabaseAdmin as any)
        .from("purchase_orders")
        .update({ ...header, total_amount: totalAmount, status: "draft" })
        .eq("id", id);
      if (errHeader) throw new Error("Gagal mengupdate PO.");

      // Delete old items
      await (supabaseAdmin as any)
        .from("purchase_order_items")
        .delete()
        .eq("purchase_order_id", id);
    } else {
      // Insert new header
      // @ts-ignore
      const { data: newPo, error: errNew } = await (supabaseAdmin as any)
        .from("purchase_orders")
        .insert({
          ...header,
          total_amount: totalAmount,
          status: "draft",
          created_by: context.userId,
        })
        .select("id")
        .single();

      if (errNew || !newPo) throw new Error(errNew?.message ?? "Gagal membuat PO.");
      poId = newPo.id;
    }

    // Insert items
    const insertItems = items.map((item) => ({
      purchase_order_id: poId!,
      ingredient_id: item.ingredient_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      subtotal: item.quantity * item.unit_cost,
    }));

    const { error: errItems } = await (supabaseAdmin as any)
      .from("purchase_order_items")
      .insert(insertItems);
    if (errItems) throw new Error("Gagal menyimpan item PO.");

    return { ok: true, id: poId };
  });

export const completePurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    // Gunakan RPC complete_purchase_order
    // @ts-ignore
    const { error } = await (context.supabase as any).rpc("complete_purchase_order", {
      p_purchase_order_id: data.orderId,
      p_user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    // Gunakan RPC cancel_purchase_order
    // @ts-ignore
    const { error } = await (context.supabase as any).rpc("cancel_purchase_order", {
      p_purchase_order_id: data.orderId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
