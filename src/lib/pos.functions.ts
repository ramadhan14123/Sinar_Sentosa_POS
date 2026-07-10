import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

function getJakartaDateParts(date = new Date()) {
  const jakartaDate = new Date(date.getTime() + JAKARTA_OFFSET_MS);
  return {
    year: jakartaDate.getUTCFullYear(),
    month: jakartaDate.getUTCMonth(),
    date: jakartaDate.getUTCDate(),
    hour: jakartaDate.getUTCHours(),
  };
}

function jakartaWallTimeToUtc(year: number, month: number, date: number) {
  return new Date(Date.UTC(year, month, date) - JAKARTA_OFFSET_MS);
}

async function assertRole(context: { supabase: any; userId: string }, role: "owner" | "cashier") {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: role,
  });
  if (error || !data) throw new Error("Anda tidak memiliki akses untuk tindakan ini.");
}

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error("Gagal membaca akses akun.");
    return { role: data?.role ?? null };
  });

export const getStaffOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Gagal memuat antrean pesanan.");
    return data;
  });

export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("confirm_order_payment", {
      p_order_id: data.orderId,
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
    const { error } = await context.supabase.rpc("update_order_status", {
      p_order_id: data.orderId,
      p_new_status: data.status,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ productId: z.string().uuid(), stock: z.number().int().min(0).max(1_000_000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!allowed) throw new Error("Akses ditolak.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
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
      ? context.supabase.from("products").update(values).eq("id", id)
      : context.supabase.from("products").insert(values);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(60),
        sortOrder: z.number().int().min(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const values = { name: data.name, sort_order: data.sortOrder, created_by: context.userId };
    const query = data.id
      ? context.supabase.from("categories").update(values).eq("id", data.id)
      : context.supabase.from("categories").insert(values);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ period: z.enum(["day", "month", "year"]) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const now = new Date();
    const jakartaNow = getJakartaDateParts(now);
    const start =
      data.period === "day"
        ? jakartaWallTimeToUtc(jakartaNow.year, jakartaNow.month, jakartaNow.date)
        : data.period === "month"
          ? jakartaWallTimeToUtc(jakartaNow.year, jakartaNow.month, 1)
          : jakartaWallTimeToUtc(jakartaNow.year, 0, 1);
    const end =
      data.period === "day"
        ? jakartaWallTimeToUtc(jakartaNow.year, jakartaNow.month, jakartaNow.date + 1)
        : data.period === "month"
          ? jakartaWallTimeToUtc(jakartaNow.year, jakartaNow.month + 1, 1)
          : jakartaWallTimeToUtc(jakartaNow.year + 1, 0, 1);
    const { data: rows, error } = await context.supabase
      .from("orders")
      .select("total_idr, created_at, order_items(product_name_snapshot, quantity)")
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const orders = rows ?? [];
    const revenue = orders.reduce((s, o) => s + (o.total_idr ?? 0), 0);
    const orderCount = orders.length;
    const avgOrder = orderCount ? Math.round(revenue / orderCount) : 0;
    const productMap = new Map<string, number>();
    let itemsSold = 0;
    orders.forEach((o) =>
      (Array.isArray(o.order_items) ? o.order_items : []).forEach((i: any) => {
        productMap.set(
          i.product_name_snapshot,
          (productMap.get(i.product_name_snapshot) ?? 0) + i.quantity,
        );
        itemsSold += i.quantity;
      }),
    );
    const topProducts = [...productMap]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    let series: { bucket: string; label: string; revenue: number; orders: number }[] = [];
    if (data.period === "day") {
      series = Array.from({ length: 24 }, (_, h) => ({
        bucket: String(h),
        label: `${String(h).padStart(2, "0")}:00`,
        revenue: 0,
        orders: 0,
      }));
      orders.forEach((o) => {
        const h = getJakartaDateParts(new Date(o.created_at)).hour;
        series[h].revenue += o.total_idr ?? 0;
        series[h].orders += 1;
      });
    } else if (data.period === "month") {
      const days = new Date(Date.UTC(jakartaNow.year, jakartaNow.month + 1, 0)).getUTCDate();
      series = Array.from({ length: days }, (_, d) => ({
        bucket: String(d + 1),
        label: String(d + 1),
        revenue: 0,
        orders: 0,
      }));
      orders.forEach((o) => {
        const d = getJakartaDateParts(new Date(o.created_at)).date - 1;
        if (series[d]) {
          series[d].revenue += o.total_idr ?? 0;
          series[d].orders += 1;
        }
      });
    } else {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      series = months.map((label, i) => ({ bucket: String(i), label, revenue: 0, orders: 0 }));
      orders.forEach((o) => {
        const m = getJakartaDateParts(new Date(o.created_at)).month;
        series[m].revenue += o.total_idr ?? 0;
        series[m].orders += 1;
      });
    }
    return { summary: { revenue, orderCount, avgOrder, itemsSold }, series, topProducts };
  });

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
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({ id: created.user.id, full_name: data.fullName });
    const { error: roleError } = await supabaseAdmin
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
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (roleError) throw new Error(roleError.message);
    const { error: profileError } = await supabaseAdmin
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
    const { data: roles, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "cashier");
    if (roleError) throw new Error(roleError.message);
    const ids = roles.map((r) => r.user_id);
    if (!ids.length) return [];
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .in("id", ids);
    if (profileError) throw new Error(profileError.message);
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw new Error(authError.message);
    const emailMap = new Map(authUsers.users.map((u) => [u.id, u.email]));
    return (profiles ?? []).map((p) => ({ ...p, email: emailMap.get(p.id) ?? "-" }));
  });

export const getOrderById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("Pesanan tidak ditemukan.");
    return order as Record<string, any>;
  });
