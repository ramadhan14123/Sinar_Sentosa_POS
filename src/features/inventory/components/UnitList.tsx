import { Trash2 } from "lucide-react";

type Props = {
  units: any[];
  isLoading: boolean;
  onOpenDelete: (unit: { id: string; name: string }) => void;
};

export function UnitList({ units, isLoading, onOpenDelete }: Props) {
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
        {units?.map((u) => (
          <div className="flex items-center gap-4 p-5" key={u.id}>
            <div className="flex-1">
              <p className="font-bold">{u.name}</p>
              <p className="text-sm text-muted-foreground">
                Simbol:{" "}
                <span className="font-mono font-medium text-foreground">{u.symbol}</span>
              </p>
            </div>
            <button
              type="button"
              className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => onOpenDelete({ id: u.id, name: u.name })}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {units?.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">Belum ada data satuan.</div>
        )}
      </div>
    </div>
  );
}
