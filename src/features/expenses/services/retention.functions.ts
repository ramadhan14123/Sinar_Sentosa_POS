import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { format } from "date-fns";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RetentionSettings = {
  receipt_active_days: number;
  receipt_cold_days: number;
  receipt_delete_days: number;
  cashier_see_all_expenses: boolean;
  expense_limit_enabled: boolean;
  expense_limit_period: "daily" | "monthly" | "yearly";
  expense_limit_amount: number;
  expense_limit_reset_time: string;
};

export type CleanupSummary = {
  movedToCold: number;
  deletedFiles: number;
  errors: string[];
  ranAt: string;
};

// ─── Read Retention Settings ──────────────────────────────────────────────────

export const getRetentionSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("get_store_settings");
    if (error) throw new Error("Gagal memuat pengaturan.");

    return {
      receipt_active_days: (data as any)?.receipt_active_days ?? 14,
      receipt_cold_days: (data as any)?.receipt_cold_days ?? 21,
      receipt_delete_days: (data as any)?.receipt_delete_days ?? 30,
      cashier_see_all_expenses: (data as any)?.cashier_see_all_expenses ?? false,
      expense_limit_enabled: (data as any)?.expense_limit_enabled ?? false,
      expense_limit_period: (data as any)?.expense_limit_period ?? "monthly",
      expense_limit_amount: Number((data as any)?.expense_limit_amount ?? 0),
      expense_limit_reset_time: (data as any)?.expense_limit_reset_time ?? "00:00:00",
    } as RetentionSettings;
  });

// ─── Save Retention Settings ──────────────────────────────────────────────────

const retentionSchema = z
  .object({
    receipt_active_days: z.number().int().min(1),
    receipt_cold_days: z.number().int().min(1),
    receipt_delete_days: z.number().int().min(1),
    cashier_see_all_expenses: z.boolean(),
    expense_limit_enabled: z.boolean().default(false),
    expense_limit_period: z.enum(["daily", "monthly", "yearly"]).default("monthly"),
    expense_limit_amount: z.number().min(0).default(0),
    expense_limit_reset_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Format harus HH:mm").default("00:00"),
  })
  .refine((v) => v.receipt_cold_days > v.receipt_active_days, {
    message: "Cold Storage harus lebih besar dari Active Storage.",
    path: ["receipt_cold_days"],
  })
  .refine((v) => v.receipt_delete_days > v.receipt_cold_days, {
    message: "Delete File harus lebih besar dari Cold Storage.",
    path: ["receipt_delete_days"],
  });

export const saveRetentionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => retentionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roleCheck, error: roleErr } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (roleErr || !roleCheck) throw new Error("Akses ditolak.");

    const { error } = await (context.supabase as any).rpc("upsert_store_settings", {
      p_settings: data,
    });
    if (error) throw new Error("Gagal menyimpan pengaturan: " + error.message);
    return { ok: true };
  });

// ─── Manual Cleanup (Run Retention) ──────────────────────────────────────────

export const runRetentionCleanup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleCheck, error: roleErr } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (roleErr || !roleCheck) throw new Error("Akses ditolak.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Get retention config
    const { data: settings } = await (supabaseAdmin as any).rpc("get_store_settings");
    const activeDays: number = (settings as any)?.receipt_active_days ?? 14;
    const deleteDays: number = (settings as any)?.receipt_delete_days ?? 30;

    const now = new Date();
    const activeCutoff = new Date(now.getTime() - activeDays * 86400000);
    const deleteCutoff = new Date(now.getTime() - deleteDays * 86400000);

    const activeCutoffDate = format(activeCutoff, "yyyy-MM-dd");
    const deleteCutoffDate = format(deleteCutoff, "yyyy-MM-dd");

    const errors: string[] = [];
    let movedToCold = 0;
    let deletedFiles = 0;

    // 2. Fetch all active and cold receipts with joined expense data
    const { data: allReceipts, error: fetchErr } = await (supabaseAdmin as any)
      .from("expense_receipts")
      .select(`
        id,
        storage_path,
        storage_tier,
        created_at,
        expense_id,
        expenses!inner (
          receipt_date,
          created_at
        )
      `)
      .in("storage_tier", ["active", "cold"]);

    if (fetchErr) {
      throw new Error("Gagal mengambil data struk untuk retensi: " + fetchErr.message);
    }

    for (const receipt of (allReceipts || [])) {
      const expReceiptDate = (receipt as any).expenses?.receipt_date; // e.g. "2026-06-01"
      const expCreatedAt = (receipt as any).expenses?.created_at || receipt.created_at; // ISO string

      // Check against both receipt_date (Tanggal Struk) and created_at (Tanggal Input)
      const isPastActive =
        (expReceiptDate && expReceiptDate <= activeCutoffDate) ||
        (expCreatedAt && new Date(expCreatedAt) <= activeCutoff);

      const isPastDelete =
        (expReceiptDate && expReceiptDate <= deleteCutoffDate) ||
        (expCreatedAt && new Date(expCreatedAt) <= deleteCutoff);

      if (isPastDelete) {
        // DELETE FILE
        try {
          const { error: storageErr } = await (supabaseAdmin as any).storage
            .from("expense-receipts")
            .remove([receipt.storage_path]);

          if (storageErr && !storageErr.message?.includes("Object not found")) {
            console.warn("Storage removal warning:", storageErr.message);
          }

          // Mark as deleted in DB (preserve metadata)
          await (supabaseAdmin as any)
            .from("expense_receipts")
            .update({ storage_tier: "deleted", deleted_at: now.toISOString() })
            .eq("id", receipt.id);

          // Audit log
          await (supabaseAdmin as any).from("expense_audit_logs").insert({
            expense_id: receipt.expense_id,
            actor_id: context.userId,
            action: "cleanup_deleted",
            notes: `File struk dihapus otomatis oleh retensi (Tanggal Struk: ${expReceiptDate || "N/A"})`,
            metadata: { storage_path: receipt.storage_path },
          });

          deletedFiles++;
        } catch (e: any) {
          errors.push(`Gagal menghapus ${receipt.storage_path}: ${e.message}`);
        }
      } else if (isPastActive && receipt.storage_tier === "active") {
        // MOVE TO COLD
        try {
          await (supabaseAdmin as any)
            .from("expense_receipts")
            .update({ storage_tier: "cold", moved_to_cold_at: now.toISOString() })
            .eq("id", receipt.id);
          movedToCold++;
        } catch (e: any) {
          errors.push(`Gagal memindahkan ${receipt.storage_path}: ${e.message}`);
        }
      }
    }

    const summary: CleanupSummary = {
      movedToCold,
      deletedFiles,
      errors,
      ranAt: now.toISOString(),
    };

    return summary;
  });
