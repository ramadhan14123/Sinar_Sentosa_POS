import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/shared/layouts/AppShell";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/shared/hooks/use-role";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import { updateStock } from "@/features/products/services/product.functions";

export const Route = createFileRoute("/_authenticated/cashier/inventory")({
  component: InventoryPage,
});
function InventoryPage() {
  const { data: role } = useRole();
  const save = useServerFn(updateStock);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
  return (
    <AppShell
      role={role?.role === "owner" ? "owner" : "cashier"}
      eyebrow="Operasional"
      title="Pembaruan Stok"
    >
      <div className="mb-5 max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="pl-9"
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-44">Stok aktual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data
              ?.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
              .map((p) => (
                <StockRow
                  key={p.id}
                  product={p}
                  onSave={async (stock) => {
                    try {
                      await save({ data: { productId: p.id, stock } });
                      toast.success(`Stok ${p.name} diperbarui.`);
                      await query.refetch();
                    } catch {
                      toast.error("Gagal memperbarui stok.");
                    }
                  }}
                />
              ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
function StockRow({
  product,
  onSave,
}: {
  product: { id: string; name: string; stock: number; is_active: boolean };
  onSave: (stock: number) => Promise<void>;
}) {
  const { saving, guard } = useActionGuard();
  const [stock, setStock] = useState(product.stock);
  return (
    <TableRow>
      <TableCell>
        <p className="font-bold">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          {product.is_active ? "Menu aktif" : "Dinonaktifkan"}
        </p>
      </TableCell>
      <TableCell>
        <span
          className={`rounded-full px-2 py-1 text-xs font-bold ${product.stock ? "bg-success-soft text-success" : "bg-destructive/10 text-destructive"}`}
        >
          {product.stock ? "Tersedia" : "Habis"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
          />
          <Button
            disabled={saving}
            onClick={() =>
              guard(async () => {
                await onSave(stock);
              })
            }
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
