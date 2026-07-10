import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bluetooth,
  CheckCircle2,
  Computer,
  Loader2,
  Printer,
  Save,
  Search,
  Usb,
  Wifi,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRole } from "@/hooks/use-role";
import { getStoreSettings, upsertStoreSettings } from "@/lib/settings.functions";
import { loadPrinterConfig, savePrinterConfig } from "@/lib/print/printer-store";
import {
  scanBluetoothDevices,
  stopScan,
  connectBluetooth,
  scanUsbDevices,
  requestUsbPermission,
  connectEthernet,
  getConnectionStatus,
  testPrintThermal,
  getWifiInfo,
  disconnect,
} from "@/lib/print/thermal-printer";
import type { ConnectionType, PrinterConfig, StoreSettings } from "@/lib/print/types";
import type { BluetoothDevice, UsbDeviceInfo, WifiNetworkInfo } from "@/lib/print/capacitor-plugin";

export const Route = createFileRoute("/app/settings/printer")({ component: PrinterSettingsPage });

const CONNECTION_OPTIONS: { value: ConnectionType; label: string; icon: typeof Bluetooth }[] = [
  { value: "bluetooth", label: "Bluetooth", icon: Bluetooth },
  { value: "usb", label: "USB (OTG)", icon: Usb },
  { value: "ethernet", label: "Ethernet / WiFi", icon: Wifi },
];

function PrinterSettingsPage() {
  const role = useRole();
  const queryClient = useQueryClient();
  const storeQuery = useQuery({ queryKey: ["store-settings"], queryFn: () => getStoreSettings() });
  const saveSettings = useServerFn(upsertStoreSettings);

  const [printer, setPrinter] = useState<PrinterConfig>(loadPrinterConfig);
  const [store, setStore] = useState<Partial<StoreSettings>>({});
  const [storeLoaded, setStoreLoaded] = useState(false);

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "failed"
  >("disconnected");
  const [connectionType, setConnectionType] = useState<"bluetooth" | "ethernet" | "usb" | "none">(
    "none",
  );

  // Bluetooth scan state
  const [scanning, setScanning] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>([]);
  const [selectedBluetoothDevice, setSelectedBluetoothDevice] = useState<BluetoothDevice | null>(
    null,
  );

  // USB scan state
  const [scanningUsb, setScanningUsb] = useState(false);
  const [usbDevices, setUsbDevices] = useState<UsbDeviceInfo[]>([]);

  // Ethernet state
  const [wifiInfo, setWifiInfo] = useState<WifiNetworkInfo | null>(null);

  // Testing state
  const [testing, setTesting] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);

  const [connecting, setConnecting] = useState(false);

  if (storeQuery.data && !storeLoaded) {
    setStore(storeQuery.data as Partial<StoreSettings>);
    setStoreLoaded(true);
  }

  // Check connection status on mount
  useEffect(() => {
    getConnectionStatus().then((s) => {
      setConnectionStatus(s.status);
      setConnectionType(s.type);
    });
    getWifiInfo().then(setWifiInfo);
  }, []);

  function updatePrinter<K extends keyof PrinterConfig>(key: K, value: PrinterConfig[K]) {
    const next = { ...printer, [key]: value };
    setPrinter(next);
    savePrinterConfig(next);
  }

  function updateStore(key: string, value: string | boolean) {
    setStore((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveStore() {
    try {
      await saveSettings({ data: store as Partial<StoreSettings> });
      toast.success("Pengaturan toko disimpan.");
      await queryClient.invalidateQueries({ queryKey: ["store-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengaturan.");
    }
  }

  // --- Bluetooth ---

  async function handleScanBluetooth() {
    setScanning(true);
    setBluetoothDevices([]);
    try {
      const devices = await scanBluetoothDevices();
      setBluetoothDevices(devices);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memindai Bluetooth.");
    } finally {
      setScanning(false);
    }
  }

  async function handleConnectBluetooth(device: BluetoothDevice) {
    setSelectedBluetoothDevice(device);
    setConnecting(true);
    setConnectionStatus("connecting");
    try {
      updatePrinter("bluetoothAddress", device.address);
      updatePrinter("printerName", device.name);
      const ok = await connectBluetooth(device.address);
      if (ok) {
        setConnectionStatus("connected");
        setConnectionType("bluetooth");
        toast.success(`Terhubung ke ${device.name}`);
      } else {
        setConnectionStatus("failed");
        toast.error("Gagal terhubung ke printer.");
      }
    } catch {
      setConnectionStatus("failed");
      toast.error("Gagal terhubung ke printer.");
    } finally {
      setConnecting(false);
    }
  }

  // --- USB ---

  async function handleScanUsb() {
    setScanningUsb(true);
    setUsbDevices([]);
    try {
      const devices = await scanUsbDevices();
      setUsbDevices(devices);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memindai USB.");
    } finally {
      setScanningUsb(false);
    }
  }

  async function handleConnectUsb(device: UsbDeviceInfo) {
    setConnecting(true);
    setConnectionStatus("connecting");
    try {
      await requestUsbPermission(device.vendorId, device.productId);
      toast.success("Izin USB diberikan.");
      setConnectionStatus("connected");
      setConnectionType("usb");
    } catch {
      setConnectionStatus("failed");
    } finally {
      setConnecting(false);
    }
  }

  // --- Ethernet ---

  async function handleConnectEthernet() {
    if (!printer.ipAddress) {
      toast.error("Masukkan alamat IP printer.");
      return;
    }
    setConnecting(true);
    setConnectionStatus("connecting");
    try {
      const ok = await connectEthernet(printer.ipAddress, printer.port);
      if (ok) {
        setConnectionStatus("connected");
        setConnectionType("ethernet");
        toast.success(`Terhubung ke ${printer.ipAddress}:${printer.port}`);
      } else {
        setConnectionStatus("failed");
        toast.error("Gagal terhubung ke printer.");
      }
    } catch {
      setConnectionStatus("failed");
      toast.error("Gagal terhubung ke printer.");
    } finally {
      setConnecting(false);
    }
  }

  // --- Test ---

  async function handleTestConnection() {
    setTesting(true);
    try {
      const status = await getConnectionStatus();
      setConnectionStatus(status.status);
      if (status.status === "connected") {
        toast.success("Printer terhubung.");
      } else {
        toast.error("Printer tidak terhubung.");
      }
    } catch {
      toast.error("Gagal menguji koneksi.");
    } finally {
      setTesting(false);
    }
  }

  async function handleTestPrint() {
    setTestPrinting(true);
    try {
      const ok = await testPrintThermal();
      if (ok) {
        toast.success("Test print berhasil dikirim.");
      } else {
        toast.error("Test print gagal.");
      }
    } catch {
      toast.error("Test print gagal.");
    } finally {
      setTestPrinting(false);
    }
  }

  async function handleDisconnect() {
    await disconnect();
    setConnectionStatus("disconnected");
    setConnectionType("none");
    setSelectedBluetoothDevice(null);
    toast.success("Printer diputuskan.");
  }

  const userRole = role.data?.role === "owner" ? "owner" : "cashier";

  const statusIcon =
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
    <AppShell role={userRole} eyebrow="Pengaturan" title="Printer & Toko">
      <div className="mx-auto max-w-2xl space-y-10">
        {/* Printer Status */}
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            <Printer className="size-5" /> Status Printer
          </h2>
          <div className="mt-4 flex items-center gap-4 rounded-2xl bg-muted/50 p-4">
            <statusIcon
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
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Putuskan
              </Button>
            )}
          </div>
        </section>

        {/* Connection Method */}
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            <Printer className="size-5" /> Koneksi Printer
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih metode koneksi printer thermal.
          </p>

          <div className="mt-6 space-y-6">
            {/* Method selector */}
            <div className="flex flex-wrap gap-2">
              {CONNECTION_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = printer.connectionType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      updatePrinter("connectionType", opt.value);
                      setSelectedBluetoothDevice(null);
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                      active
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="size-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Bluetooth */}
            {printer.connectionType === "bluetooth" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pastikan Bluetooth tablet menyala dan printer dalam keadaan pairing mode.
                </p>

                <Button
                  onClick={handleScanBluetooth}
                  disabled={scanning}
                  className="h-11 w-full rounded-xl"
                >
                  {scanning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  {scanning ? "Memindai..." : "Cari Printer Bluetooth"}
                </Button>

                {bluetoothDevices.length > 0 && (
                  <div className="rounded-xl border">
                    {bluetoothDevices.map((device) => (
                      <button
                        key={device.address}
                        onClick={() => handleConnectBluetooth(device)}
                        disabled={connecting}
                        className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left transition last:border-b-0 hover:bg-muted/50 ${
                          selectedBluetoothDevice?.address === device.address
                            ? "bg-primary-soft"
                            : ""
                        }`}
                      >
                        <Bluetooth className="size-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{device.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {device.address}
                          </p>
                        </div>
                        {device.paired && (
                          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                            Paired
                          </span>
                        )}
                        {connecting && selectedBluetoothDevice?.address === device.address && (
                          <Loader2 className="size-4 animate-spin text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {!scanning && bluetoothDevices.length === 0 && (
                  <div className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                    Tekan tombol "Cari Printer Bluetooth" untuk menemukan perangkat.
                  </div>
                )}

                {/* Manual input */}
                <details className="rounded-xl border p-4">
                  <summary className="cursor-pointer text-sm font-bold text-muted-foreground">
                    Input manual
                  </summary>
                  <div className="mt-4 space-y-3">
                    <div>
                      <Label htmlFor="bt-name">Nama Printer</Label>
                      <Input
                        id="bt-name"
                        value={printer.printerName}
                        onChange={(e) => updatePrinter("printerName", e.target.value)}
                        placeholder="Nama printer"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bt-address">Alamat Bluetooth</Label>
                      <Input
                        id="bt-address"
                        value={printer.bluetoothAddress}
                        onChange={(e) => updatePrinter("bluetoothAddress", e.target.value)}
                        placeholder="00:11:22:AA:BB:CC"
                        className="mt-1.5 font-mono"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!printer.bluetoothAddress || connecting}
                      onClick={() =>
                        connectBluetooth(printer.bluetoothAddress).then((ok) => {
                          if (ok) {
                            setConnectionStatus("connected");
                            setConnectionType("bluetooth");
                            toast.success("Terhubung.");
                          } else {
                            setConnectionStatus("failed");
                            toast.error("Gagal terhubung.");
                          }
                        })
                      }
                    >
                      {connecting ? <Loader2 className="size-4 animate-spin" /> : null}
                      Hubungkan Manual
                    </Button>
                  </div>
                </details>
              </div>
            )}

            {/* USB */}
            {printer.connectionType === "usb" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Hubungkan printer via kabel USB OTG. Pastikan printer menyala.
                </p>

                <Button
                  onClick={handleScanUsb}
                  disabled={scanningUsb}
                  className="h-11 w-full rounded-xl"
                >
                  {scanningUsb ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  {scanningUsb ? "Memindai..." : "Cari Perangkat USB"}
                </Button>

                {usbDevices.length > 0 && (
                  <div className="rounded-xl border">
                    {usbDevices.map((device, i) => (
                      <button
                        key={i}
                        onClick={() => handleConnectUsb(device)}
                        disabled={connecting}
                        className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition last:border-b-0 hover:bg-muted/50"
                      >
                        <Usb className="size-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold truncate">{device.deviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            Vendor: {device.vendorId} | Product: {device.productId}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!scanningUsb && usbDevices.length === 0 && (
                  <div className="rounded-2xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                    Hubungkan printer USB dan tekan tombol "Cari Perangkat USB".
                  </div>
                )}
              </div>
            )}

            {/* Ethernet */}
            {printer.connectionType === "ethernet" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Pastikan printer dan tablet berada pada jaringan WiFi yang sama.
                </p>

                {wifiInfo && (
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Jaringan Saat Ini
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Wifi className="size-4 text-primary" />
                      <span className="text-sm font-bold">{wifiInfo.ssid}</span>
                      <span className="text-xs text-muted-foreground">({wifiInfo.ipAddress})</span>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <Label htmlFor="ip-address">Alamat IP Printer</Label>
                    <Input
                      id="ip-address"
                      value={printer.ipAddress}
                      onChange={(e) => updatePrinter("ipAddress", e.target.value)}
                      placeholder="192.168.1.100"
                      className="mt-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="port">Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={printer.port}
                      onChange={(e) => updatePrinter("port", Number(e.target.value))}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleConnectEthernet}
                  disabled={connecting || !printer.ipAddress}
                  className="h-11 w-full rounded-xl"
                >
                  {connecting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Wifi className="size-4" />
                  )}
                  {connecting ? "Menghubungkan..." : "Hubungkan ke Printer"}
                </Button>
              </div>
            )}

            {/* Auto-print toggle */}
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <p className="text-sm font-bold">Cetak otomatis</p>
                <p className="text-xs text-muted-foreground">
                  Cetak struk langsung setelah pembayaran berhasil.
                </p>
              </div>
              <Switch
                checked={printer.autoPrint}
                onCheckedChange={(v) => updatePrinter("autoPrint", v)}
              />
            </div>
          </div>
        </section>

        {/* Test Connection & Print */}
        {connectionStatus === "connected" && (
          <section className="rounded-3xl border bg-background p-6 shadow-sm">
            <h2 className="font-display text-xl font-extrabold">Uji Coba Printer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pastikan printer siap digunakan sebelum transaksi.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
                className="h-11 rounded-xl"
              >
                {testing ? <Loader2 className="size-4 animate-spin" /> : null}
                Uji Koneksi
              </Button>
              <Button onClick={handleTestPrint} disabled={testPrinting} className="h-11 rounded-xl">
                {testPrinting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Printer className="size-4" />
                )}
                Cetak Uji Coba
              </Button>
            </div>
          </section>
        )}

        {/* Store Information */}
        <section className="rounded-3xl border bg-background p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            <Computer className="size-5" /> Informasi Toko
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Data ini akan muncul pada struk pembayaran.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="business-name">Nama Usaha</Label>
              <Input
                id="business-name"
                value={store.business_name ?? ""}
                onChange={(e) => updateStore("business_name", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="business-address">Alamat</Label>
              <Input
                id="business-address"
                value={store.business_address ?? ""}
                onChange={(e) => updateStore("business_address", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="business-phone">Telepon</Label>
              <Input
                id="business-phone"
                value={store.business_phone ?? ""}
                onChange={(e) => updateStore("business_phone", e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="wifi-ssid">WiFi SSID</Label>
                <Input
                  id="wifi-ssid"
                  value={store.wifi_ssid ?? ""}
                  onChange={(e) => updateStore("wifi_ssid", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="wifi-password">WiFi Password</Label>
                <Input
                  id="wifi-password"
                  value={store.wifi_password ?? ""}
                  onChange={(e) => updateStore("wifi_password", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border p-4">
              <p className="text-sm font-bold">Tampilkan WiFi di struk</p>
              <Switch
                checked={store.show_wifi ?? true}
                onCheckedChange={(v) => updateStore("show_wifi", v)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={store.instagram ?? ""}
                  onChange={(e) => updateStore("instagram", e.target.value)}
                  placeholder="@username"
                  className="mt-1.5"
                />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex w-full items-center justify-between">
                  <Label htmlFor="show-instagram" className="text-sm">
                    Tampilkan di struk
                  </Label>
                  <Switch
                    id="show-instagram"
                    checked={store.show_instagram ?? true}
                    onCheckedChange={(v) => updateStore("show_instagram", v)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={store.whatsapp ?? ""}
                  onChange={(e) => updateStore("whatsapp", e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="mt-1.5"
                />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex w-full items-center justify-between">
                  <Label htmlFor="show-whatsapp" className="text-sm">
                    Tampilkan di struk
                  </Label>
                  <Switch
                    id="show-whatsapp"
                    checked={store.show_whatsapp ?? false}
                    onCheckedChange={(v) => updateStore("show_whatsapp", v)}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={store.website ?? ""}
                onChange={(e) => updateStore("website", e.target.value)}
                placeholder="https://"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="footer">Pesan Kaki</Label>
              <Input
                id="footer"
                value={store.footer_message ?? ""}
                onChange={(e) => updateStore("footer_message", e.target.value)}
                className="mt-1.5"
              />
            </div>

            <Button
              onClick={handleSaveStore}
              className="h-11 w-full rounded-xl"
              disabled={!storeLoaded}
            >
              <Save className="size-4" /> Simpan Pengaturan Toko
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
