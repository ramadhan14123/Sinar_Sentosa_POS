import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ReceiptText, Tag } from "lucide-react";
import { AppShell } from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { useRole } from "@/shared/hooks/use-role";
import { ExpenseList } from "@/features/expenses/components/ExpenseList";
import { ExpenseCategoryList } from "@/features/expenses/components/ExpenseCategoryList";
import { ExpenseSummaryCards } from "@/features/expenses/components/ExpenseSummaryCards";
import { useExpensesQuery } from "@/features/expenses/queries/expense.queries";
import { getExpenses } from "@/features/expenses/services/expense.functions";

export const Route = createFileRoute("/_authenticated/owner/expenses")({
  component: OwnerExpensesPage,
});

type TabKey = "list" | "categories";
const TABS: { key: TabKey; label: string; icon: typeof ReceiptText }[] = [
  { key: "list", label: "Daftar Pengeluaran", icon: ReceiptText },
  { key: "categories", label: "Kategori", icon: Tag },
];

type StatusFilter = "submitted" | "approved" | "rejected" | undefined;
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: undefined, label: "Semua" },
  { key: "submitted", label: "Menunggu" },
  { key: "approved", label: "Disetujui" },
  { key: "rejected", label: "Ditolak" },
];

function OwnerExpensesPage() {
  const role = useRole();
  const fetchExpenses = useServerFn(getExpenses);

  const [tab, setTab] = useState<TabKey>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);

  const expensesQuery = useExpensesQuery({ status: statusFilter });
  const { data, isLoading } = useQuery({
    ...expensesQuery,
    queryFn: () => fetchExpenses({ data: { page: 1, pageSize: 50, status: statusFilter } }),
  });

  return (
    <AppShell role="owner" eyebrow="Keuangan" title="Manajemen Pengeluaran">
      <div className="mx-auto max-w-3xl space-y-6">
        <ExpenseSummaryCards />
        
        {/* Tab switcher */}
        <div className="flex gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <Button
                key={t.key}
                variant={tab === t.key ? "default" : "outline"}
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => setTab(t.key)}
              >
                <Icon className="size-4" />
                {t.label}
              </Button>
            );
          })}
        </div>

        {tab === "list" && (
          <>
            {/* Status filter */}
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <Button
                  key={f.label}
                  variant={statusFilter === f.key ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            <ExpenseList
              expenses={data?.expenses ?? []}
              isLoading={isLoading}
              isOwner={true}
            />
          </>
        )}

        {tab === "categories" && <ExpenseCategoryList />}
      </div>
    </AppShell>
  );
}
