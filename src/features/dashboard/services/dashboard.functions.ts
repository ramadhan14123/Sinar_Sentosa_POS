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

export const getAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        period: z.enum(["day", "month", "year"]),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const now = data.startDate ? new Date(data.startDate) : new Date();
    const jakartaNow = getJakartaDateParts(now);
    const start = data.startDate
      ? new Date(data.startDate)
      : data.period === "day"
        ? jakartaWallTimeToUtc(jakartaNow.year, jakartaNow.month, jakartaNow.date)
        : data.period === "month"
          ? jakartaWallTimeToUtc(jakartaNow.year, jakartaNow.month, 1)
          : jakartaWallTimeToUtc(jakartaNow.year, 0, 1);
    const end = data.endDate
      ? new Date(data.endDate)
      : data.period === "day"
        ? jakartaWallTimeToUtc(jakartaNow.year, jakartaNow.month, jakartaNow.date + 1)
        : data.period === "month"
          ? jakartaWallTimeToUtc(jakartaNow.year, jakartaNow.month + 1, 1)
          : jakartaWallTimeToUtc(jakartaNow.year + 1, 0, 1);
    const { data: rows, error } = await (context.supabase as any)
      .from("orders")
      .select("total_idr, created_at, order_items(product_name_snapshot, quantity)")
      .eq("status", "completed")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const orders = rows ?? [];
    const revenue = orders.reduce((s: any, o: any) => s + (o.total_idr ?? 0), 0);
    const orderCount = orders.length;
    const avgOrder = orderCount ? Math.round(revenue / orderCount) : 0;
    const productMap = new Map<string, number>();
    let itemsSold = 0;
    orders.forEach((o: any) =>
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
      orders.forEach((o: any) => {
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
      orders.forEach((o: any) => {
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
      orders.forEach((o: any) => {
        const m = getJakartaDateParts(new Date(o.created_at)).month;
        series[m].revenue += o.total_idr ?? 0;
        series[m].orders += 1;
      });
    }
    return { summary: { revenue, orderCount, avgOrder, itemsSold }, series, topProducts };
  });
