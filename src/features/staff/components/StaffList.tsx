import { Mail, ShieldCheck, Trash2 } from "lucide-react";

type Props = {
  staffList: any[];
  isLoading: boolean;
  onOpenDelete: (staff: { id: string; full_name: string }) => void;
};

export function StaffList({ staffList, isLoading, onOpenDelete }: Props) {
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
      <div className="border-b p-5">
        <h2 className="font-bold">Daftar Kasir</h2>
      </div>
      {staffList?.length ? (
        <div className="divide-y">
          {staffList.map((p: any) => (
            <div key={p.id} className="flex items-center gap-4 p-5">
              <div className="grid size-11 place-items-center rounded-full bg-success-soft text-success">
                <ShieldCheck />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{p.full_name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Mail className="size-3 shrink-0" />
                  {p.email}
                </p>
              </div>
              <button
                type="button"
                className="flex size-10 cursor-pointer items-center justify-center rounded-xl text-destructive transition-colors hover:bg-destructive/10"
                onClick={() => onOpenDelete({ id: p.id, full_name: p.full_name })}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">Belum ada akun Kasir.</div>
      )}
    </div>
  );
}
