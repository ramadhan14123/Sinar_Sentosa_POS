import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeDollarSign, Package2, ReceiptText, ShoppingBasket, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { PeriodDatePicker } from "@/shared/components/ui/period-date-picker";
import { useRole } from "@/shared/hooks/use-role";
import { formatIDR } from "@/shared/utils/format";
import { getAnalytics } from "@/features/dashboard/services/dashboard.functions";

export const Route = createFileRoute("/_authenticated/owner/")({ component: OwnerPage });

type Period = "day" | "month" | "year";
const periodLabels: Record<Period, string> = {
  day: "Hari ini",
  month: "Bulan ini",
  year: "Tahun ini",
};
const chartTitles: Record<Period, string> = {
  day: "Pendapatan per jam",
  month: "Pendapatan harian bulan ini",
  year: "Pendapatan bulanan tahun ini",
};
type ChartPoint = { bucket: string; label: string; revenue: number; orders?: number };

function OwnerPage() {
  const role = useRole();
  const [period, setPeriod] = useState<Period>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const fetchAnalytics = useServerFn(getAnalytics);
  const analytics = useQuery({
    queryKey: ["analytics", period, selectedDate.toISOString()],
    queryFn: () =>
      fetchAnalytics({
        data: {
          period,
          startDate: selectedDate.toISOString(),
          endDate:
            period === "day"
              ? new Date(selectedDate.getTime() + 86400000).toISOString()
              : period === "month"
                ? new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1).toISOString()
                : new Date(selectedDate.getFullYear() + 1, 0, 1).toISOString(),
        },
      }),
    enabled: role.data?.role === "owner",
  });
  if (role.data && role.data.role !== "owner") return <Navigate to="/cashier" replace />;
  const summary = analytics.data?.summary ?? {
    revenue: 0,
    orderCount: 0,
    avgOrder: 0,
    itemsSold: 0,
  };
  const series = analytics.data?.series ?? [];
  const topProducts = analytics.data?.topProducts ?? [];

  return (
    <AppShell role="owner" eyebrow="Dashboard Owner" title="Ringkasan Bisnis">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(Object.keys(periodLabels) as Period[]).map((p) => (
          <Button
            key={p}
            variant={period === p ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => {
              setPeriod(p);
              setSelectedDate(new Date());
            }}
          >
            {periodLabels[p]}
          </Button>
        ))}
        <PeriodDatePicker period={period} value={selectedDate} onChange={setSelectedDate} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {analytics.isPending ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <Kpi
              icon={BadgeDollarSign}
              label={`Pendapatan ${periodLabels[period].toLowerCase()}`}
              value={formatIDR(summary.revenue)}
              raw={summary.revenue}
              format="currency"
              tone="primary"
            />
            <Kpi
              icon={ReceiptText}
              label="Transaksi selesai"
              value={String(summary.orderCount)}
              raw={summary.orderCount}
              format="integer"
              tone="primary"
            />
            <Kpi
              icon={ShoppingBasket}
              label="Rata-rata order"
              value={formatIDR(summary.avgOrder)}
              raw={summary.avgOrder}
              format="currency"
              tone="primary"
            />
            <Kpi
              icon={Package2}
              label="Item terjual"
              value={String(summary.itemsSold)}
              raw={summary.itemsSold}
              format="integer"
              tone="primary"
            />
          </>
        )}
      </div>
      <section className="mt-6 rounded-2xl border bg-background p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Tren performa</p>
            <h2 className="mt-1 font-display text-xl font-extrabold">{chartTitles[period]}</h2>
          </div>
          <TrendingUp className="text-success" />
        </div>
        <div className="h-56 sm:h-72">
          {analytics.isPending ? (
            <ChartSkeleton />
          ) : series.length && summary.revenue > 0 ? (
            <LineTrendChart data={series} period={period} />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Belum ada transaksi pada periode ini.
            </div>
          )}
        </div>
      </section>
      <section className="mt-6 rounded-2xl border bg-background p-4 sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Performa menu</p>
            <h2 className="mt-1 font-display text-xl font-extrabold">Produk terlaris</h2>
          </div>
        </div>
        {topProducts.length ? (
          <TopProductsChart data={topProducts} />
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada produk terjual di periode ini.
          </p>
        )}
      </section>
    </AppShell>
  );
}

function LineTrendChart({ data, period }: { data: ChartPoint[]; period: Period }) {
  const isDay = period === "day";
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 4, bottom: 24, left: 4 }}>
        <defs>
          <linearGradient id="revenueArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fontWeight: 600, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          interval={isDay ? 3 : "preserveStartEnd"}
        />
        <YAxis
          tickFormatter={formatShortIDR}
          tick={{ fontSize: 12, fontWeight: 500, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={35}
          dx={-5}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: "var(--border)", strokeDasharray: "4 6" }}
        />
        <Area type="monotone" dataKey="revenue" stroke="none" fill="url(#revenueArea)" />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--primary)"
          strokeWidth={4}
          dot={
            isDay
              ? { r: 2, strokeWidth: 1.5, fill: "var(--background)", stroke: "var(--primary)" }
              : { r: 5, fill: "var(--background)", strokeWidth: 3, stroke: "var(--primary)" }
          }
          activeDot={{ r: 7, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="font-bold">{point.label}</p>
      <p className="text-sm text-muted-foreground">{formatIDR(point.revenue)}</p>
      {point.orders != null && (
        <p className="text-xs text-muted-foreground">{point.orders} transaksi</p>
      )}
    </div>
  );
}

function formatShortIDR(value: number) {
  if (value >= 1_000_000)
    return `${Number((value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1))}jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`;
  return String(value);
}

function Kpi({
  icon: Icon,
  label,
  value,
  raw,
  format,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  raw?: number;
  format?: "currency" | "integer";
  tone: "primary" | "info" | "success";
}) {
  return (
    <div className="rounded-2xl border bg-background p-3.5 sm:p-5">
      <div
        className={`grid size-10 place-items-center rounded-xl ${tone === "primary" ? "bg-primary-soft text-primary" : tone === "info" ? "bg-info-soft text-info" : "bg-success-soft text-success"}`}
      >
        <Icon className="size-5" />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-[1.35rem] font-extrabold sm:text-2xl">
        {raw != null ? <AnimatedNumber value={raw} format={format} /> : value}
      </p>
    </div>
  );
}

function AnimatedNumber({ value, format }: { value: number; format?: "currency" | "integer" }) {
  const motionValue = useMotionValue(0);
  const displayed = useTransform(motionValue, (latest) => {
    const n = Math.round(latest);
    return format === "currency" ? formatIDR(n) : String(n);
  });

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 1.2, ease: "easeOut" });
    return controls.stop;
  }, [value]);

  return <motion.span>{displayed}</motion.span>;
}

function KpiSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border bg-background p-3.5 sm:p-5">
      <div className="size-10 rounded-xl bg-muted" />
      <div className="mt-4 h-3 w-24 rounded bg-muted" />
      <div className="mt-2 h-7 w-32 rounded bg-muted" />
    </div>
  );
}

const topProductColors = [
  "var(--primary)",
  "color-mix(in oklch, var(--primary) 60%, var(--background))",
  "color-mix(in oklch, var(--primary) 40%, var(--background))",
  "color-mix(in oklch, var(--primary) 25%, var(--background))",
  "color-mix(in oklch, var(--primary) 15%, var(--background))",
];

function TopProductsChart({ data }: { data: { name: string; quantity: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={data.length * 52 + 16}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 13, fontWeight: 600, fill: "var(--foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<TopProductsTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="quantity" radius={[0, 6, 6, 0]} barSize={20}>
          {data.map((_, index) => (
            <Cell key={index} fill={topProductColors[index % topProductColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TopProductsTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border bg-background p-3 shadow-sm">
      <p className="font-bold">{item.name}</p>
      <p className="text-sm text-muted-foreground">{item.quantity} terjual</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-full animate-pulse items-end gap-3 p-2">
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "30%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "55%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "40%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "72%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "48%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "82%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "52%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "68%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "35%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "60%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "75%" }} />
      <div className="w-6 rounded-sm bg-muted/70" style={{ height: "45%" }} />
    </div>
  );
}
