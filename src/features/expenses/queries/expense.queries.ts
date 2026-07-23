import { useServerFn } from "@tanstack/react-start";
import {
  getExpenseCategories,
  getExpenses,
  getExpenseAuditLog,
  getExpenseSummaryStats,
} from "../services/expense.functions";
import { getRetentionSettings } from "../services/retention.functions";

export function useExpenseCategoriesQuery() {
  const fn = useServerFn(getExpenseCategories);
  return {
    queryKey: ["expense-categories"] as const,
    queryFn: () => fn({}),
  };
}

export function useExpensesQuery(params: {
  status?: "draft" | "submitted" | "approved" | "rejected";
  category_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  pageSize?: number;
}) {
  const fn = useServerFn(getExpenses);
  return {
    queryKey: ["expenses", params] as const,
    queryFn: () => fn({ data: { page: 1, pageSize: 20, ...params } }),
  };
}

export function useExpenseAuditLogQuery(expenseId: string) {
  const fn = useServerFn(getExpenseAuditLog);
  return {
    queryKey: ["expense-audit-log", expenseId] as const,
    queryFn: () => fn({ data: { expenseId } }),
    enabled: !!expenseId,
  };
}

export function useRetentionSettingsQuery() {
  const fn = useServerFn(getRetentionSettings);
  return {
    queryKey: ["retention-settings"] as const,
    queryFn: () => fn({}),
  };
}

export function useExpenseSummaryStatsQuery(date?: string) {
  const fn = useServerFn(getExpenseSummaryStats);
  return {
    queryKey: ["expense-summary-stats", date] as const,
    queryFn: () => fn({ data: { date } }),
  };
}
