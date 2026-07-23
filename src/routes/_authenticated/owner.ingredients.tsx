import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/shared/layouts/AppShell";
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import { unitsQuery } from "@/features/inventory/queries/unit.queries";
import {
  ingredientsQuery,
  ingredientCategoriesQuery,
  stockMovementsQuery,
} from "@/features/ingredients/queries/ingredient.queries";
import { saveIngredient, adjustStock } from "@/features/ingredients/services/ingredient.functions";

import { IngredientList } from "@/features/ingredients/components/IngredientList";
import { IngredientFormCard } from "@/features/ingredients/components/IngredientFormCard";
import { StockAdjustmentDialog } from "@/features/ingredients/components/StockAdjustmentDialog";
import { StockHistoryDialog } from "@/features/ingredients/components/StockHistoryDialog";

export const Route = createFileRoute("/_authenticated/owner/ingredients")({
  component: IngredientsPage,
});

function IngredientsPage() {
  const role = useRole();
  const save = useServerFn(saveIngredient);
  const adjust = useServerFn(adjustStock);
  const { saving, guard } = useActionGuard();

  const [id, setId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [minStock, setMinStock] = useState("");

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<"adjustment" | "waste" | "return">("adjustment");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const query = useQuery({
    ...ingredientsQuery,
    enabled: role.data?.role === "owner",
  });

  const unitsQ = useQuery({
    ...unitsQuery,
    enabled: role.data?.role === "owner",
  });

  const catsQ = useQuery({
    ...ingredientCategoriesQuery,
    enabled: role.data?.role === "owner",
  });

  const movementsQ = useQuery({
    ...stockMovementsQuery(id || ""),
    enabled: !!selectedIngredient && historyModalOpen,
  });

  if (role.data && role.data.role !== "owner") return <Navigate to="/cashier" replace />;

  function resetForm() {
    setId(undefined);
    setName("");
    setSku("");
    setCategoryId("");
    setUnitId("");
    setMinStock("");
  }

  function handleEdit(i: any) {
    setId(i.id);
    setName(i.name);
    setSku(i.sku || "");
    setCategoryId(i.category_id);
    setUnitId(i.unit_id);
    setMinStock(i.minimum_stock.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openAdjustModal(i: any) {
    setSelectedIngredient(i);
    setAdjustType("adjustment");
    setAdjustQuantity("");
    setAdjustNotes("");
    setAdjustModalOpen(true);
  }

  function openHistoryModal(i: any) {
    setSelectedIngredient(i);
    setHistoryModalOpen(true);
  }

  async function handleSaveIngredient(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !categoryId || !unitId)
      return toast.error("Nama, Kategori, dan Satuan wajib diisi");

    await guard(async () => {
      try {
        await save({
          data: {
            id,
            name,
            sku,
            category_id: categoryId,
            unit_id: unitId,
            minimum_stock: minStock ? parseFloat(minStock) : 0,
            is_active: true,
          },
        });
        resetForm();
        toast.success(id ? "Bahan diperbarui." : "Bahan ditambahkan.");
        await query.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyimpan bahan.");
      }
    });
  }

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedIngredient || !adjustQuantity) return;

    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty)) return toast.error("Kuantitas tidak valid");

    await guard(async () => {
      try {
        await adjust({
          data: {
            ingredientId: selectedIngredient.id,
            adjustmentType: adjustType,
            quantity: qty,
            notes: adjustNotes,
          },
        });
        toast.success("Stok berhasil disesuaikan.");
        setAdjustModalOpen(false);
        await query.refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menyesuaikan stok.");
      }
    });
  }

  return (
    <AppShell role="owner" eyebrow="Inventory" title="Bahan Baku">
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <IngredientFormCard
          id={id}
          name={name}
          setName={setName}
          sku={sku}
          setSku={setSku}
          categoryId={categoryId}
          setCategoryId={setCategoryId}
          unitId={unitId}
          setUnitId={setUnitId}
          minStock={minStock}
          setMinStock={setMinStock}
          categories={catsQ.data || []}
          units={unitsQ.data || []}
          saving={saving}
          onReset={resetForm}
          onSubmit={handleSaveIngredient}
        />

        <IngredientList
          ingredients={query.data || []}
          isLoading={query.isLoading}
          onEdit={handleEdit}
          onOpenAdjust={openAdjustModal}
          onOpenHistory={openHistoryModal}
        />
      </div>

      <StockAdjustmentDialog
        open={adjustModalOpen}
        onOpenChange={setAdjustModalOpen}
        selectedIngredient={selectedIngredient}
        adjustType={adjustType}
        setAdjustType={setAdjustType}
        adjustQuantity={adjustQuantity}
        setAdjustQuantity={setAdjustQuantity}
        adjustNotes={adjustNotes}
        setAdjustNotes={setAdjustNotes}
        saving={saving}
        onSubmit={handleAdjustSubmit}
      />

      <StockHistoryDialog
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        selectedIngredient={selectedIngredient}
        movementsData={movementsQ.data}
        isLoading={movementsQ.isLoading}
      />
    </AppShell>
  );
}
