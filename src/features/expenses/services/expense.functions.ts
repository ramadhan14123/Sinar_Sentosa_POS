import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { format, endOfMonth, endOfYear, startOfMonth, startOfYear, subDays } from "date-fns";

export function getOperationalDate(date: Date, resetTime: string): string {
  const [hours, minutes] = (resetTime || "00:00").split(":").map(Number);
  let opDate = new Date(date);
  if (opDate.getHours() < hours || (opDate.getHours() === hours && opDate.getMinutes() < minutes)) {
    opDate = subDays(opDate, 1);
  }
  return format(opDate, "yyyy-MM-dd");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpenseCategory = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export type Expense = {
  id: string;
  category_id: string;
  submitted_by: string;
  merchant: string;
  receipt_number: string | null;
  receipt_date: string;
  amount: number;
  description: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  category?: { name: string };
  submitter?: { full_name: string };
  approver?: { full_name: string } | null;
  receipts?: ExpenseReceipt[];
};

export type ExpenseReceipt = {
  id: string;
  expense_id: string;
  storage_path: string;
  file_size_bytes: number | null;
  storage_tier: "active" | "cold" | "deleted";
  created_at: string;
};

export type ExpenseAuditLog = {
  id: string;
  expense_id: string;
  action: string;
  notes: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  actor?: { full_name: string } | null;
};

// ─── Category Functions ────────────────────────────────────────────────────────

export const getExpenseCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("expense_categories")
      .select("*")
      .order("name");
    if (error) throw new Error("Gagal memuat kategori pengeluaran.");
    return data as ExpenseCategory[];
  });

export const saveExpenseCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(100),
        description: z.string().trim().max(500).nullable().optional(),
        is_active: z.boolean().default(true),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roleCheck, error: roleErr } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (roleErr || !roleCheck) throw new Error("Akses ditolak.");

    const { id, ...values } = data;
    const query = id
      ? (context.supabase as any).from("expense_categories").update(values).eq("id", id)
      : (context.supabase as any).from("expense_categories").insert({ ...values, created_by: context.userId });
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExpenseCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: roleCheck, error: roleErr } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (roleErr || !roleCheck) throw new Error("Akses ditolak.");

    const { error } = await (context.supabase as any)
      .from("expense_categories")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error("Gagal menghapus kategori: " + error.message);
    return { ok: true };
  });

// ─── Expense CRUD ──────────────────────────────────────────────────────────────

const expenseSubmitSchema = z.object({
  category_id: z.string().uuid(),
  merchant: z.string().trim().min(1).max(200),
  receipt_number: z.string().trim().max(100).nullable().optional(),
  receipt_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  description: z.string().trim().min(1).max(1000),
  // Storage path is set after upload in client, passed here for DB record
  storage_path: z.string().min(1),
  file_size_bytes: z.number().int().positive().optional(),
});

export const submitExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => expenseSubmitSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check expense limits
    const { data: settingsData, error: settingsErr } = await (context.supabase as any).rpc("get_store_settings");
    if (settingsErr) throw new Error("Gagal mengambil pengaturan toko.");
    const settings = settingsData as any;

    if (settings.expense_limit_enabled) {
      let query = (supabaseAdmin as any).from("expenses").select("amount");
      query = query.in("status", ["submitted", "approved"]);

      if (settings.expense_limit_period === "daily") {
        query = query.eq("receipt_date", data.receipt_date);
      } else if (settings.expense_limit_period === "monthly") {
        const monthStart = format(startOfMonth(new Date(data.receipt_date)), "yyyy-MM-dd");
        const monthEnd = format(endOfMonth(new Date(data.receipt_date)), "yyyy-MM-dd");
        query = query.gte("receipt_date", monthStart).lte("receipt_date", monthEnd);
      } else if (settings.expense_limit_period === "yearly") {
        const yearStart = format(startOfYear(new Date(data.receipt_date)), "yyyy-MM-dd");
        const yearEnd = format(endOfYear(new Date(data.receipt_date)), "yyyy-MM-dd");
        query = query.gte("receipt_date", yearStart).lte("receipt_date", yearEnd);
      }

      const { data: activeExpenses, error: activeErr } = await query;
      if (activeErr) throw new Error("Gagal memvalidasi limit pengeluaran.");

      const totalActive = (activeExpenses || []).reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);
      const limitAmount = Number(settings.expense_limit_amount);

      if (totalActive + data.amount > limitAmount) {
        const periodStr = settings.expense_limit_period === "daily" ? "Harian" : settings.expense_limit_period === "monthly" ? "Bulanan" : "Tahunan";
        const remaining = Math.max(0, limitAmount - totalActive);
        throw new Error(`Pengajuan melebihi limit pengeluaran ${periodStr}. Limit: Rp ${limitAmount.toLocaleString("id-ID")}, Sisa Limit: Rp ${remaining.toLocaleString("id-ID")}.`);
      }
    }

    // Insert expense
    const { data: expense, error: expErr } = await (supabaseAdmin as any)
      .from("expenses")
      .insert({
        category_id: data.category_id,
        submitted_by: context.userId,
        merchant: data.merchant,
        receipt_number: data.receipt_number ?? null,
        receipt_date: data.receipt_date,
        amount: data.amount,
        description: data.description,
        status: "submitted",
      })
      .select("id")
      .single();

    if (expErr || !expense) throw new Error("Gagal menyimpan pengeluaran: " + expErr?.message);

    // Insert receipt record
    const { error: recErr } = await (supabaseAdmin as any).from("expense_receipts").insert({
      expense_id: expense.id,
      storage_path: data.storage_path,
      file_size_bytes: data.file_size_bytes ?? null,
      storage_tier: "active",
    });
    if (recErr) throw new Error("Gagal menyimpan data struk: " + recErr.message);

    // Audit log
    await (supabaseAdmin as any).from("expense_audit_logs").insert({
      expense_id: expense.id,
      actor_id: context.userId,
      action: "submitted",
      notes: "Pengeluaran diajukan",
    });

    return { ok: true, expenseId: expense.id };
  });

export const getExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["draft", "submitted", "approved", "rejected"]).optional(),
        category_id: z.string().uuid().optional(),
        from_date: z.string().optional(),
        to_date: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let query = (context.supabase as any)
      .from("expenses")
      .select(
        `*, 
        category:expense_categories(name),
        receipts:expense_receipts(id, storage_path, storage_tier, created_at)`,
        { count: "exact" },
      );

    if (data.status) query = query.eq("status", data.status);
    if (data.category_id) query = query.eq("category_id", data.category_id);
    if (data.from_date) query = query.gte("receipt_date", data.from_date);
    if (data.to_date) query = query.lte("receipt_date", data.to_date);

    const { data: rawExpenses, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error("Gagal memuat pengeluaran: " + error.message);

    const userIds = Array.from(
      new Set(
        (rawExpenses || []).flatMap((e: any) => [e.submitted_by, e.approved_by]).filter(Boolean),
      ),
    );

    let profileMap: Record<string, { full_name: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profiles) {
        profileMap = Object.fromEntries(
          profiles.map((p: any) => [p.id, { full_name: p.full_name }]),
        );
      }
    }

    const expenses = (rawExpenses || []).map((e: any) => ({
      ...e,
      submitter: profileMap[e.submitted_by] || null,
      approver: e.approved_by ? profileMap[e.approved_by] || null : null,
    }));

    return {
      expenses: expenses as Expense[],
      total: count ?? 0,
      page: data.page,
      totalPages: Math.ceil((count ?? 0) / data.pageSize),
    };
  });

// ─── Approval ─────────────────────────────────────────────────────────────────

export const approveExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ expenseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: roleCheck, error: roleErr } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (roleErr || !roleCheck) throw new Error("Akses ditolak.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await (supabaseAdmin as any)
      .from("expenses")
      .update({ status: "approved", approved_by: context.userId, approved_at: new Date().toISOString() })
      .eq("id", data.expenseId)
      .eq("status", "submitted");

    if (error) throw new Error("Gagal menyetujui pengeluaran: " + error.message);

    await (supabaseAdmin as any).from("expense_audit_logs").insert({
      expense_id: data.expenseId,
      actor_id: context.userId,
      action: "approved",
      notes: "Pengeluaran disetujui oleh owner",
    });

    return { ok: true };
  });

export const rejectExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ expenseId: z.string().uuid(), reason: z.string().trim().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: roleCheck, error: roleErr } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (roleErr || !roleCheck) throw new Error("Akses ditolak.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await (supabaseAdmin as any)
      .from("expenses")
      .update({ status: "rejected", rejection_reason: data.reason })
      .eq("id", data.expenseId)
      .eq("status", "submitted");

    if (error) throw new Error("Gagal menolak pengeluaran: " + error.message);

    await (supabaseAdmin as any).from("expense_audit_logs").insert({
      expense_id: data.expenseId,
      actor_id: context.userId,
      action: "rejected",
      notes: data.reason,
    });

    return { ok: true };
  });

export const getExpenseAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ expenseId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: logs, error } = await (supabaseAdmin as any)
      .from("expense_audit_logs")
      .select("*")
      .eq("expense_id", data.expenseId)
      .order("created_at", { ascending: true });

    if (error) throw new Error("Gagal memuat audit log: " + error.message);

    const actorIds = Array.from(new Set((logs || []).map((l: any) => l.actor_id).filter(Boolean)));
    let profileMap: Record<string, { full_name: string }> = {};
    if (actorIds.length > 0) {
      const { data: profiles } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);

      if (profiles) {
        profileMap = Object.fromEntries(
          profiles.map((p: any) => [p.id, { full_name: p.full_name }]),
        );
      }
    }

    const formattedLogs = (logs || []).map((l: any) => ({
      ...l,
      actor: l.actor_id ? profileMap[l.actor_id] || null : null,
    }));

    return formattedLogs as ExpenseAuditLog[];
  });

// ─── Storage Signed URL ────────────────────────────────────────────────────────

export const getReceiptSignedUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ storagePath: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await (supabaseAdmin as any).storage
      .from("expense-receipts")
      .createSignedUrl(data.storagePath, 3600); // 1 hour

    if (error || !signed?.signedUrl) throw new Error("Gagal membuat link akses struk.");
    return { url: signed.signedUrl as string };
  });

// ─── Summary Stats ─────────────────────────────────────────────────────────────

export const getExpenseSummaryStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ date: z.string().optional() }).parse(input)) // date defaults to today if not provided
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Gunakan admin client agar total limit bisa mengakumulasi seluruh pengeluaran toko, 
    // bukan hanya pengeluaran kasir bersangkutan (RLS bypass)
    const { data: settingsData, error: settingsErr } = await (supabaseAdmin as any).rpc("get_store_settings");
    if (settingsErr) throw new Error("Gagal memuat pengaturan toko.");
    const settings = settingsData as any;

    const now = new Date();
    
    let targetDate = data.date;
    if (!targetDate) {
      targetDate = getOperationalDate(now, settings.expense_limit_reset_time || "00:00:00");
    }

    // Tanggal untuk filter harus akurat (local time, bukan UTC)
    let query = (supabaseAdmin as any).from("expenses").select("status, amount, receipt_date");

    if (settings.expense_limit_period === "daily") {
      query = query.eq("receipt_date", targetDate);
    } else if (settings.expense_limit_period === "monthly") {
      const monthStart = format(startOfMonth(new Date(targetDate)), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date(targetDate)), "yyyy-MM-dd");
      query = query.gte("receipt_date", monthStart).lte("receipt_date", monthEnd);
    } else if (settings.expense_limit_period === "yearly") {
      const yearStart = format(startOfYear(new Date(targetDate)), "yyyy-MM-dd");
      const yearEnd = format(endOfYear(new Date(targetDate)), "yyyy-MM-dd");
      query = query.gte("receipt_date", yearStart).lte("receipt_date", yearEnd);
    }

    const { data: expenses, error: expensesErr } = await query;
    if (expensesErr) throw new Error("Gagal memuat data pengeluaran.");

    const stats = {
      approved: { total: 0, count: 0 },
      pending: { total: 0, count: 0 },
      rejected: { total: 0, count: 0 },
      limit: {
        enabled: settings.expense_limit_enabled === true,
        period: settings.expense_limit_period as "daily" | "monthly" | "yearly",
        amount: Number(settings.expense_limit_amount) || 0,
        used: 0,
        remaining: 0,
      }
    };

    (expenses || []).forEach((exp: any) => {
      const amt = Number(exp.amount);
      if (exp.status === "approved") {
        stats.approved.total += amt;
        stats.approved.count += 1;
        stats.limit.used += amt;
      } else if (exp.status === "submitted") {
        stats.pending.total += amt;
        stats.pending.count += 1;
        stats.limit.used += amt; // submitted is counted against limit
      } else if (exp.status === "rejected") {
        stats.rejected.total += amt;
        stats.rejected.count += 1;
      }
    });

    stats.limit.remaining = Math.max(0, stats.limit.amount - stats.limit.used);

    return stats;
  });

// ─── Limit Analysis ────────────────────────────────────────────────────────────

export const getExpenseLimitAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        period: z.enum(["daily", "monthly", "yearly"]),
        limit_amount: z.number().positive(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: expenses, error } = await (supabaseAdmin as any)
      .from("expenses")
      .select("receipt_date, amount, status")
      .in("status", ["approved", "submitted"]);

    if (error) throw new Error("Gagal memuat data analisis.");

    // Grouping by date/month/year
    const groups: Record<string, number> = {};

    (expenses || []).forEach((exp: any) => {
      let key = "";
      if (data.period === "daily") {
        key = exp.receipt_date; // yyyy-MM-dd
      } else if (data.period === "monthly") {
        key = exp.receipt_date.substring(0, 7); // yyyy-MM
      } else if (data.period === "yearly") {
        key = exp.receipt_date.substring(0, 4); // yyyy
      }

      if (!groups[key]) groups[key] = 0;
      groups[key] += Number(exp.amount);
    });

    const analysisData = Object.keys(groups)
      .sort((a, b) => b.localeCompare(a)) // sort descending (newest first)
      .map((key) => {
        const used = groups[key];
        const remaining = Math.max(0, data.limit_amount - used);
        const overLimit = Math.max(0, used - data.limit_amount);
        const efficiencyPercent = data.limit_amount > 0 ? (remaining / data.limit_amount) * 100 : 0;

        return {
          period_key: key,
          used,
          remaining,
          over_limit: overLimit,
          efficiency_percent: Number(efficiencyPercent.toFixed(2)),
          is_efficient: used <= data.limit_amount,
        };
      });

    return analysisData;
  });
