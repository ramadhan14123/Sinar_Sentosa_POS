import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PlusCircle, ReceiptText } from "lucide-react";
import { AppShell } from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { useRole } from "@/shared/hooks/use-role";
import { ExpenseList } from "@/features/expenses/components/ExpenseList";
import { ExpenseForm } from "@/features/expenses/components/ExpenseForm";
import { ExpenseSummaryCards } from "@/features/expenses/components/ExpenseSummaryCards";
import { useExpensesQuery } from "@/features/expenses/queries/expense.queries";
import { getExpenses } from "@/features/expenses/services/expense.functions";

export const Route = createFileRoute("/_authenticated/cashier/expenses")({
  component: CashierExpensesPage,
});

function CashierExpensesPage() {
  const role = useRole();
  const userRole = role.data?.role === "owner" ? "owner" : "cashier";
  const fetchExpenses = useServerFn(getExpenses);
  const [formOpen, setFormOpen] = useState(false);

  const expensesQuery = useExpensesQuery({ pageSize: 50 });
  const { data, isLoading, refetch } = useQuery({
    ...expensesQuery,
    queryFn: () => fetchExpenses({ data: { page: 1, pageSize: 50 } }),
  });

  return (
    <AppShell role={userRole} eyebrow="Operasional" title="Pengeluaran Saya">
      <div className="mx-auto max-w-3xl space-y-5">
        <ExpenseSummaryCards />

        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)} className="gap-2 rounded-full">
            <PlusCircle className="size-4" /> Ajukan Pengeluaran
          </Button>
        </div>

        <ExpenseList
          expenses={data?.expenses ?? []}
          isLoading={isLoading}
          isOwner={false}
        />
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="size-5" /> Ajukan Pengeluaran Baru
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <ExpenseForm
              onSuccess={() => {
                setFormOpen(false);
                refetch();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
