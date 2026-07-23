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
    <section className="rounded-3xl border bg-background p-6 shadow-sm max-w-3xl mx-auto">
      <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
        <PlayCircle className="size-5" /> Jalankan Cleanup Manual
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Proses retensi akan memindahkan file ke Cold Storage dan menghapus file yang sudah melewati batas retensi sesuai konfigurasi di atas. Metadata transaksi tidak akan dihapus.
      </p>

      <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>File yang dihapus tidak dapat dipulihkan. Pastikan pengaturan retensi sudah sesuai sebelum menjalankan cleanup.</span>
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="h-11 w-full gap-2" disabled={running}>
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
                Sistem akan memindahkan file yang melebihi <strong>Active Storage Duration</strong> ke Cold Storage, dan menghapus file yang melebihi <strong>File Deletion Duration</strong>. Metadata transaksi tidak akan dihapus.
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

        {/* Cleanup result */}
        {cleanupResult && (
          <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
            <p className="font-bold">Hasil Cleanup</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dipindahkan ke Cold Storage</span>
              <span className="font-semibold text-blue-600">{cleanupResult.movedToCold} file</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File Dihapus</span>
              <span className="font-semibold text-destructive">{cleanupResult.deletedFiles} file</span>
            </div>
            {cleanupResult.errors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-destructive">{cleanupResult.errors.length} Error:</p>
                <ul className="mt-1 space-y-0.5">
                  {cleanupResult.errors.map((e, i) => (
                    <li key={i} className="text-xs text-destructive">• {e}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Dijalankan: {new Date(cleanupResult.ranAt).toLocaleString("id-ID")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
