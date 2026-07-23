import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/shared/layouts/AppShell";
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";

import { ingredientsQuery } from "@/features/ingredients/queries/ingredient.queries";
import { suppliersQuery } from "@/features/suppliers/queries/supplier.queries";
import { purchaseOrdersQuery } from "@/features/purchases/queries/purchase.queries";
import {
  getPurchaseOrderById,
  savePurchaseOrder,
  completePurchaseOrder,
  cancelPurchaseOrder,
} from "@/features/purchases/services/purchase.functions";

import { PurchaseOrderList } from "@/features/purchases/components/PurchaseOrderList";
import { PurchaseOrderForm } from "@/features/purchases/components/PurchaseOrderForm";
import { PurchaseOrderDetail } from "@/features/purchases/components/PurchaseOrderDetail";

export const Route = createFileRoute("/_authenticated/owner/purchases")({
  component: PurchasesPage,
});

function PurchasesPage() {
  const role = useRole();
  const [view, setView] = useState<"list" | "form" | "detail">("list");

  // List State
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const query = useQuery({
    ...purchaseOrdersQuery(page, 20, statusFilter === "" ? undefined : statusFilter),
    enabled: role.data?.role === "owner" && view === "list",
  });

  // Form State
  const save = useServerFn(savePurchaseOrder);
  const complete = useServerFn(completePurchaseOrder);
  const cancelPO = useServerFn(cancelPurchaseOrder);
  const { saving, guard } = useActionGuard();

  const [id, setId] = useState<string | undefined>(undefined);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    { ingredient_id: string; quantity: string; unit_cost: string }[]
  >([]);

  // Detail State
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const poDetailQ = useQuery({
    queryKey: ["purchaseOrder", selectedPoId],
    queryFn: () => getPurchaseOrderById({ data: { orderId: selectedPoId! } }),
    enabled: !!selectedPoId && view === "detail",
  });

  const suppliersQ = useQuery({
    ...suppliersQuery,
    enabled: role.data?.role === "owner" && view === "form",
  });
  const ingredientsQ = useQuery({
    ...ingredientsQuery,
    enabled: role.data?.role === "owner" && view === "form",
  });

  if (role.data && role.data.role !== "owner") return <Navigate to="/cashier" replace />;

  function openCreate() {
    setId(undefined);
    setSupplierId("");
    setInvoiceNumber("");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setItems([]);
    setView("form");
  }

  function openDetail(poId: string) {
    setSelectedPoId(poId);
    setView("detail");
  }

  function handleEditDraft(po: any) {
    setId(po.id);
    setSupplierId(po.supplier_id);
    setInvoiceNumber(po.invoice_number);
    setPurchaseDate(po.purchase_date.slice(0, 10));
    setNotes(po.notes || "");

    getPurchaseOrderById({ data: { orderId: po.id } }).then((data) => {
      setItems(
        data.items.map((i: any) => ({
          ingredient_id: i.ingredient_id,
          quantity: i.quantity.toString(),
          unit_cost: i.unit_cost.toString(),
        })),
      );
      setView("form");
    });
  }

  async function handleSaveForm(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || !invoiceNumber || items.length === 0) {
      return toast.error("Lengkapi data dan minimal 1 item");
    }

    const parsedItems = items.map((i) => ({
      ingredient_id: i.ingredient_id,
      quantity: parseFloat(i.quantity),
      unit_cost: parseFloat(i.unit_cost),
    }));

    if (
      parsedItems.some(
        (i) =>
          !i.ingredient_id ||
          isNaN(i.quantity) ||
          isNaN(i.unit_cost) ||
          i.quantity <= 0 ||
          i.unit_cost < 0,
      )
    ) {
      return toast.error("Ada data item yang tidak valid");
    }

    await guard(async () => {
      try {
        await save({
          data: {
            id,
            supplier_id: supplierId,
            invoice_number: invoiceNumber,
            purchase_date: new Date(purchaseDate).toISOString(),
            notes,
            items: parsedItems,
          },
        });
        toast.success(id ? "PO Draft diperbarui" : "PO Draft dibuat");
        setView("list");
        query.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan PO.");
      }
    });
  }

  async function handleAction(action: "complete" | "cancel") {
    if (!selectedPoId) return;
    if (!confirm(`Yakin ingin ${action === "complete" ? "Menyelesaikan" : "Membatalkan"} PO ini?`))
      return;

    await guard(async () => {
      try {
        if (action === "complete") {
          await complete({ data: { orderId: selectedPoId } });
          toast.success("PO diselesaikan. Stok dan HPP telah diupdate.");
        } else {
          await cancelPO({ data: { orderId: selectedPoId } });
          toast.success("PO dibatalkan.");
        }
        poDetailQ.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Gagal melakukan aksi.`);
      }
    });
  }

  return (
    <AppShell role="owner" eyebrow="Inventory" title="Pembelian (PO)">
      {view === "list" && (
        <PurchaseOrderList
          query={query}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          setPage={setPage}
          openCreate={openCreate}
          openDetail={openDetail}
          handleEditDraft={handleEditDraft}
        />
      )}

      {view === "form" && (
        <PurchaseOrderForm
          id={id}
          supplierId={supplierId}
          setSupplierId={setSupplierId}
          invoiceNumber={invoiceNumber}
          setInvoiceNumber={setInvoiceNumber}
          purchaseDate={purchaseDate}
          setPurchaseDate={setPurchaseDate}
          notes={notes}
          setNotes={setNotes}
          items={items}
          setItems={setItems}
          suppliersQ={suppliersQ}
          ingredientsQ={ingredientsQ}
          handleSaveForm={handleSaveForm}
          setView={setView}
          saving={saving}
        />
      )}

      {view === "detail" && (
        <PurchaseOrderDetail
          poDetailQ={poDetailQ}
          setView={setView}
          handleAction={handleAction}
          saving={saving}
        />
      )}
    </AppShell>
  );
}
