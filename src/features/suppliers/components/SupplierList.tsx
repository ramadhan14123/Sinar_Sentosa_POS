import { Edit, Trash2 } from "lucide-react";

type Props = {
  suppliers: any[];
  isLoading: boolean;
  onEdit: (supplier: any) => void;
  onDeleteTarget: (supplier: { id: string; name: string }) => void;
};

export function SupplierList({ suppliers, isLoading, onEdit, onDeleteTarget }: Props) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-background p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-background">
      <div className="divide-y">
        {suppliers?.map((s) => (
          <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-start" key={s.id}>
            <div className="flex-1 space-y-1">
              <p className="font-bold text-lg">{s.name}</p>
              <div className="text-sm text-muted-foreground flex flex-col gap-0.5">
                {s.phone && <p>📞 {s.phone}</p>}
                {s.email && <p>📧 {s.email}</p>}
                {s.address && <p>📍 {s.address}</p>}
                {s.notes && <p className="italic mt-1 text-xs">Catatan: {s.notes}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 sm:mt-0">
              <button
                type="button"
                className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary/10"
                onClick={() => onEdit(s)}
                title="Edit"
              >
                <Edit className="size-4" />
              </button>
              <button
                type="button"
                className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10"
                onClick={() => onDeleteTarget({ id: s.id, name: s.name })}
                title="Hapus"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
        {suppliers?.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">Belum ada data supplier.</div>
        )}
      </div>
    </div>
  );
}
