import { AlertTriangle, Loader2, PlayCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import type { CleanupSummary } from "@/features/expenses/services/retention.functions";

type Props = {
  running: boolean;
  cleanupResult: CleanupSummary | null;
  onRunCleanup: () => void;
};

export function ManualCleanupCard({ running, cleanupResult, onRunCleanup }: Props) {
  return (
    <section className="rounded-2xl border bg-background shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
          <PlayCircle className="size-4" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold leading-tight">
            Cleanup Manual
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Jalankan proses retensi sekarang sesuai konfigurasi di atas
          </p>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* Warning */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span className="text-xs leading-relaxed">
            File yang dihapus <strong>tidak dapat dipulihkan</strong>. Pastikan pengaturan retensi sudah sesuai sebelum menjalankan cleanup.
          </span>
        </div>

        {/* Action Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="h-10 w-full gap-2"
              disabled={running}
            >
              {running ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PlayCircle className="size-4" />
              )}
              {running ? "Menjalankan Cleanup..." : "Jalankan Cleanup Sekarang"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Jalankan Storage Cleanup?</AlertDialogTitle>
              <AlertDialogDescription>
                Sistem akan memindahkan file yang melebihi{" "}
                <strong>Active Storage Duration</strong> ke Cold Storage, dan
                menghapus file yang melebihi{" "}
                <strong>File Deletion Duration</strong>. Metadata transaksi tidak
                akan dihapus.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={onRunCleanup}>
                Ya, Jalankan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cleanup Result */}
        {cleanupResult && (
          <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Hasil Cleanup
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-950/40">
                <p className="text-xs text-muted-foreground">Dipindahkan ke Cold</p>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                  {cleanupResult.movedToCold} file
                </p>
              </div>
              <div className="rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950/40">
                <p className="text-xs text-muted-foreground">Dihapus</p>
                <p className="text-base font-bold text-destructive">
                  {cleanupResult.deletedFiles} file
                </p>
              </div>
            </div>
            {cleanupResult.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-red-50 p-3 dark:bg-red-950/20">
                <p className="text-xs font-semibold text-destructive">
                  {cleanupResult.errors.length} Error:
                </p>
                <ul className="mt-1 space-y-0.5">
                  {cleanupResult.errors.map((e, i) => (
                    <li key={i} className="text-xs text-destructive">
                      • {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground">
              Dijalankan:{" "}
              {new Date(cleanupResult.ranAt).toLocaleString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
