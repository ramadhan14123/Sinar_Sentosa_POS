import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bluetooth, Computer, Printer, Save, Usb, Wifi } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRole } from "@/hooks/use-role";
import { getStoreSettings, upsertStoreSettings } from "@/lib/settings.functions";
import { loadPrinterConfig, savePrinterConfig } from "@/lib/print/printer-store";
import type { ConnectionType, PrinterConfig } from "@/lib/print/types";

export const Route = createFileRoute("/app/settings/printer")({ component: PrinterSettingsPage });

const CONNECTION_OPTIONS: { value: ConnectionType; label: string; icon: typeof Bluetooth }[] = [
  { value: "bluetooth", label: "Bluetooth", icon: Bluetooth },
  { value: "usb", label: "USB (OTG)", icon: Usb },
  { value: "ethernet", label: "Ethernet / WiFi", icon: Wifi },
];

function PrinterSettingsPage() {
  const role = useRole();
  const queryClient = useQueryClient();
  const [printer, setPrinter] = useState<PrinterConfig>(loadPrinterConfig);
  const storeQuery = useQuery({ queryKey: ["store-settings"], queryFn: () => getStoreSettings() });
  const saveSettings = useServerFn(upsertStoreSettings);

  const [store, setStore] = useState<Record<string, any>>({});
  const [storeLoaded, setStoreLoaded] = useState(false);

  if (storeQuery.data && !storeLoaded) {
    setStore(storeQuery.data as Record<string, any>);
    setStoreLoaded(true);
  }

  function updatePrinter<K extends keyof PrinterConfig>(key: K, value: PrinterConfig[K]) {
    const next = { ...printer, [key]: value };
    setPrinter(next);
    savePrinterConfig(next);
  }

  async function handleSaveStore() {
    try {
      await saveSettings({ data: store as any });
      toast.success("Pengaturan toko disimpan.");
      await queryClient.invalidateQueries({ queryKey: ["store-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengaturan.");
    }
  }

  function updateStore(key: string, value: any) {
    setStore((prev) => ({ ...prev, [key]: value }));
  }

  const userRole = role.data?.role === "owner" ? "owner" : "cashier";

  return (
    <AppShell role={userRole} eyebrow="Pengaturan" title="Printer & Toko">
      <div className="mx-auto max-w-2xl space-y-10">
        {/* Printer Connection */}
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            <Printer className="size-5" /> Koneksi Printer
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Konfigurasi printer thermal untuk mencetak struk.</p>

          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              {CONNECTION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = printer.connectionType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updatePrinter("connectionType", opt.value)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      active ? "border-primary bg-primary-soft text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="size-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="printer-name">Nama Printer</Label>
                <Input id="printer-name" value={printer.printerName} onChange={(e) => updatePrinter("printerName", e.target.value)} placeholder="Nama printer (opsional)" className="mt-1.5" />
              </div>

              {printer.connectionType === "bluetooth" && (
                <div>
                  <Label htmlFor="bt-address">Alamat Bluetooth</Label>
                  <Input id="bt-address" value={printer.bluetoothAddress} onChange={(e) => updatePrinter("bluetoothAddress", e.target.value)} placeholder="Contoh: 00:11:22:AA:BB:CC" className="mt-1.5 font-mono" />
                </div>
              )}

              {printer.connectionType === "ethernet" && (
                <>
                  <div>
                    <Label htmlFor="ip-address">Alamat IP</Label>
                    <Input id="ip-address" value={printer.ipAddress} onChange={(e) => updatePrinter("ipAddress", e.target.value)} placeholder="Contoh: 192.168.1.100" className="mt-1.5 font-mono" />
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input id="port" type="number" value={printer.port} onChange={(e) => updatePrinter("port", Number(e.target.value))} className="mt-1.5" />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <p className="text-sm font-bold">Cetak otomatis</p>
                  <p className="text-xs text-muted-foreground">Cetak struk langsung setelah pembayaran berhasil.</p>
                </div>
                <Switch checked={printer.autoPrint} onCheckedChange={(v) => updatePrinter("autoPrint", v)} />
              </div>
            </div>
          </div>
        </section>

        {/* Store Information */}
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            <Computer className="size-5" /> Informasi Toko
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Data ini akan muncul pada struk pembayaran.</p>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="business-name">Nama Usaha</Label>
              <Input id="business-name" value={store.business_name ?? ""} onChange={(e) => updateStore("business_name", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="business-address">Alamat</Label>
              <Input id="business-address" value={store.business_address ?? ""} onChange={(e) => updateStore("business_address", e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="business-phone">Telepon</Label>
              <Input id="business-phone" value={store.business_phone ?? ""} onChange={(e) => updateStore("business_phone", e.target.value)} className="mt-1.5" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="wifi-ssid">WiFi SSID</Label>
                <Input id="wifi-ssid" value={store.wifi_ssid ?? ""} onChange={(e) => updateStore("wifi_ssid", e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="wifi-password">WiFi Password</Label>
                <Input id="wifi-password" value={store.wifi_password ?? ""} onChange={(e) => updateStore("wifi_password", e.target.value)} className="mt-1.5" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-4">
              <p className="text-sm font-bold">Tampilkan WiFi di struk</p>
              <Switch checked={store.show_wifi ?? true} onCheckedChange={(v) => updateStore("show_wifi", v)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" value={store.instagram ?? ""} onChange={(e) => updateStore("instagram", e.target.value)} placeholder="@username" className="mt-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-instagram">Tampilkan IG</Label>
                  <Switch checked={store.show_instagram ?? true} onCheckedChange={(v) => updateStore("show_instagram", v)} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={store.whatsapp ?? ""} onChange={(e) => updateStore("whatsapp", e.target.value)} placeholder="08xxxxxxxxxx" className="mt-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-whatsapp">Tampilkan WA</Label>
                  <Switch checked={store.show_whatsapp ?? false} onCheckedChange={(v) => updateStore("show_whatsapp", v)} />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={store.website ?? ""} onChange={(e) => updateStore("website", e.target.value)} placeholder="https://" className="mt-1.5" />
            </div>

            <div>
              <Label htmlFor="footer">Pesan Kaki</Label>
              <Input id="footer" value={store.footer_message ?? ""} onChange={(e) => updateStore("footer_message", e.target.value)} className="mt-1.5" />
            </div>

            <Button onClick={handleSaveStore} className="h-11 w-full rounded-xl" disabled={!storeLoaded}>
              <Save className="size-4" /> Simpan Pengaturan Toko
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
