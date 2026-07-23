import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIngredient: any;
  movementsData: any;
  isLoading: boolean;
};

export function StockHistoryDialog({
  open,
  onOpenChange,
  selectedIngredient,
  movementsData,
  isLoading,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Riwayat Stok: {selectedIngredient?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-4 border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="p-3 text-left font-semibold">Waktu</th>
                <th className="p-3 text-left font-semibold">Tipe</th>
                <th className="p-3 text-right font-semibold">Stok Awal</th>
                <th className="p-3 text-right font-semibold">Perubahan</th>
                <th className="p-3 text-right font-semibold">Stok Akhir</th>
                <th className="p-3 text-left font-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    Memuat riwayat...
                  </td>
                </tr>
              ) : movementsData?.movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    Belum ada riwayat pergerakan stok.
                  </td>
                </tr>
              ) : (
                movementsData?.movements.map((m: any) => (
                  <tr key={m.id}>
                    <td className="p-3">{new Date(m.created_at).toLocaleString("id-ID")}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                        ${
                          m.movement_type === "purchase"
                            ? "bg-blue-100 text-blue-700"
                            : m.movement_type === "sale"
                              ? "bg-orange-100 text-orange-700"
                              : m.movement_type === "waste"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {m.stock_before} {selectedIngredient?.unit?.symbol}
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${m.quantity > 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </td>
                    <td className="p-3 text-right font-bold">
                      {m.stock_after} {selectedIngredient?.unit?.symbol}
                    </td>
                    <td className="p-3 max-w-[200px] truncate" title={m.notes}>
                      {m.notes || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
