import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatIDR } from "@/shared/utils/format";

export function PurchaseOrderDetail({
  poDetailQ,
  setView,
  handleAction,
  saving,
}: {
  poDetailQ: any;
  setView: (v: "list") => void;
  handleAction: (action: "complete" | "cancel") => void;
  saving: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => setView("list")}>
          <ArrowLeft className="mr-2 size-4" /> Kembali
        </Button>
        <h2 className="text-2xl font-bold">Detail Pembelian</h2>
      </div>

      {poDetailQ.isLoading ? (
        <p>Memuat detail...</p>
      ) : !poDetailQ.data ? (
        <p>Data tidak ditemukan.</p>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-background p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    No. Invoice
                  </h3>
                  <p className="font-mono text-xl font-bold">{poDetailQ.data.invoice_number}</p>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-full text-sm font-bold uppercase
                    ${
                      poDetailQ.data.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : poDetailQ.data.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                >
                  {poDetailQ.data.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal</p>
                  <p className="font-semibold">
                    {new Date(poDetailQ.data.purchase_date).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-bold text-primary">{formatIDR(poDetailQ.data.total_amount)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p className="font-semibold text-lg">{poDetailQ.data.supplier?.name}</p>
                {poDetailQ.data.supplier?.phone && (
                  <p className="text-sm text-muted-foreground">{poDetailQ.data.supplier.phone}</p>
                )}
              </div>
              {poDetailQ.data.notes && (
                <div>
                  <p className="text-xs text-muted-foreground">Catatan</p>
                  <p className="text-sm italic">{poDetailQ.data.notes}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-background p-6">
              <h3 className="font-bold text-lg border-b pb-2 mb-4">Item Pembelian</h3>
              <div className="space-y-3">
                {poDetailQ.data.items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center border-b border-dashed pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-semibold">{item.ingredient?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.ingredient?.unit?.symbol} x{" "}
                        {formatIDR(item.unit_cost)}
                      </p>
                    </div>
                    <p className="font-bold">{formatIDR(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {poDetailQ.data.status === "draft" && (
            <div className="flex gap-4 p-6 bg-muted/30 rounded-2xl border border-dashed justify-end">
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => handleAction("cancel")}
              >
                <XCircle className="size-4 mr-2" /> Batalkan PO
              </Button>
              <Button disabled={saving} onClick={() => handleAction("complete")}>
                <CheckCircle2 className="size-4 mr-2" /> Selesaikan & Update Stok
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
