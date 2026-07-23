import { CheckCircle2, Loader2, Printer, XCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { BluetoothDevice } from "@/integrations/printer/capacitor-plugin";
import type { PrinterConfig } from "@/integrations/printer/types";

type Props = {
  connectionStatus: "disconnected" | "connecting" | "connected" | "failed";
  connectionType: "bluetooth" | "ethernet" | "usb" | "none";
  selectedBluetoothDevice: BluetoothDevice | null;
  printer: PrinterConfig;
  onDisconnect: () => void;
};

export function PrinterStatusCard({
  connectionStatus,
  connectionType,
  selectedBluetoothDevice,
  printer,
  onDisconnect,
}: Props) {
  const StatusIcon =
    connectionStatus === "connected"
      ? CheckCircle2
      : connectionStatus === "connecting"
        ? Loader2
        : XCircle;

  const statusColor =
    connectionStatus === "connected"
      ? "text-success"
      : connectionStatus === "connecting"
        ? "text-warning"
        : "text-destructive";

  const statusLabel =
    connectionStatus === "connected"
      ? "Terhubung"
      : connectionStatus === "connecting"
        ? "Menghubungkan..."
        : "Tidak Terhubung";

  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
        <Printer className="size-5" /> Status Printer
      </h2>
      <div className="mt-4 flex items-center gap-4 rounded-2xl bg-muted/50 p-4">
        <StatusIcon
          className={`size-10 ${connectionStatus === "connecting" ? "animate-spin" : ""} ${statusColor}`}
        />
        <div className="flex-1">
          <p className={`text-lg font-bold ${statusColor}`}>{statusLabel}</p>
          {connectionStatus === "connected" && (
            <p className="text-sm text-muted-foreground">
              {selectedBluetoothDevice?.name || printer.printerName || "Printer"}
              {connectionType !== "none" && ` — ${connectionType}`}
            </p>
          )}
          {connectionStatus === "disconnected" && (
            <p className="text-sm text-muted-foreground">
              Belum ada printer yang terhubung. Pilih metode koneksi di bawah.
            </p>
          )}
          {connectionStatus === "failed" && (
            <p className="text-sm text-muted-foreground">
              Printer gagal terhubung. Periksa koneksi dan coba lagi.
            </p>
          )}
        </div>
        {connectionStatus === "connected" && (
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            Putuskan
          </Button>
        )}
      </div>
    </section>
  );
}
