import { Computer, Loader2, Printer } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

type Props = {
  testing: boolean;
  testPrinting: boolean;
  testingDrawer: boolean;
  onTestConnection: () => void;
  onTestPrint: () => void;
  onTestCashDrawer: () => void;
};

export function PrinterTestCard({
  testing,
  testPrinting,
  testingDrawer,
  onTestConnection,
  onTestPrint,
  onTestCashDrawer,
}: Props) {
  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm">
      <h2 className="font-display text-xl font-extrabold">Uji Coba Printer</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pastikan printer siap digunakan sebelum transaksi.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={onTestConnection}
          disabled={testing}
          className="h-11 rounded-xl"
        >
          {testing ? <Loader2 className="size-4 animate-spin" /> : null}
          Uji Koneksi
        </Button>
        <Button onClick={onTestPrint} disabled={testPrinting} className="h-11 rounded-xl">
          {testPrinting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Printer className="size-4" />
          )}
          Cetak Uji Coba
        </Button>
        <Button
          onClick={onTestCashDrawer}
          disabled={testingDrawer}
          className="h-11 rounded-xl"
        >
          {testingDrawer ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Computer className="size-4" />
          )}
          Uji Cash Drawer
        </Button>
      </div>
    </section>
  );
}
