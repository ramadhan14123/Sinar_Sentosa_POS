// Import custom logo SVG. Vite treats SVG imports as URLs by default.
import sinarLogo from "@/assets/sinarsentosa.svg";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src={sinarLogo} alt="Sinar Sentosa" className="size-9" />
      {!compact && (
        <div>
          <p className="font-display text-lg font-bold leading-none">Sinar Sentosa</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Soto Seger Boyolali
          </p>
        </div>
      )}
    </div>
  );
}
