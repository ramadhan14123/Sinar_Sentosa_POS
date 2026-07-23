import { Trash2 } from "lucide-react";

type Props = {
  categories: any[];
  isLoading: boolean;
  onOpenDelete: (cat: { id: string; name: string }) => void;
};

export function CategoryList({ categories, isLoading, onOpenDelete }: Props) {
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
        {categories?.map((c, index) => (
          <div className="flex items-center gap-4 p-5" key={c.id}>
            <span className="grid size-9 place-items-center rounded-lg bg-muted text-sm font-bold">
              {index + 1}
            </span>
            <div className="flex-1">
              <p className="font-bold">{c.name}</p>
              <p className="text-xs text-muted-foreground">Urutan tampil {c.sort_order}</p>
            </div>
            <button
              type="button"
              className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => onOpenDelete({ id: c.id, name: c.name })}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {categories?.length === 0 && (
          <div className="p-10 text-center text-muted-foreground">Belum ada data kategori.</div>
        )}
      </div>
    </div>
  );
}
