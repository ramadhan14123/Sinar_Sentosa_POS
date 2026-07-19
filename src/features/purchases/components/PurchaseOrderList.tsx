import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatIDR } from "@/shared/utils/format";

export function PurchaseOrderList({
  query,
  statusFilter,
  setStatusFilter,
  setPage,
  openCreate,
  openDetail,
  handleEditDraft,
}: {
  query: any;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  setPage: (p: number) => void;
  openCreate: () => void;
  openDetail: (id: string) => void;
  handleEditDraft: (po: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" /> Buat PO Baru
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-4 text-left font-semibold">Tanggal</th>
              <th className="p-4 text-left font-semibold">No. Invoice</th>
              <th className="p-4 text-left font-semibold">Supplier</th>
              <th className="p-4 text-right font-semibold">Total</th>
              <th className="p-4 text-center font-semibold">Status</th>
              <th className="p-4 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="p-10 text-center">
                  Memuat...
                </td>
              </tr>
            ) : query.data?.orders?.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center">
                  Belum ada data pembelian.
                </td>
              </tr>
            ) : (
              query.data?.orders?.map((po: any) => (
                <tr key={po.id} className="hover:bg-muted/50 transition-colors">
                  <td className="p-4">{new Date(po.purchase_date).toLocaleDateString("id-ID")}</td>
                  <td className="p-4 font-mono font-medium">{po.invoice_number}</td>
                  <td className="p-4 font-bold">{po.supplier?.name}</td>
                  <td className="p-4 text-right font-semibold text-primary">
                    {formatIDR(po.total_amount)}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold uppercase
                      ${
                        po.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : po.status === "cancelled"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(po.id)}>
                      Detail
                    </Button>
                    {po.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDraft(po)}
                        className="text-primary hover:text-primary"
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
