import { ChefHat } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-color"><ChefHat className="size-5" /></div>
      {!compact && <div><p className="font-display text-lg font-bold leading-none">Sinar Sentosa</p><p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dapur & Kasir</p></div>}
    </div>
  );
}