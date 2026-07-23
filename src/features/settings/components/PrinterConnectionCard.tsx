import {
  Bluetooth,
  Loader2,
  Printer,
  Search,
  Usb,
  Wifi,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  openAppSettings,
  openBluetoothSettings,
  openWifiSettings,
} from "@/integrations/printer/thermal-printer";
import type { ConnectionType, PrinterConfig } from "@/integrations/printer/types";
import type {
  BluetoothDevice,
  UsbDeviceInfo,
  WifiNetworkInfo,
} from "@/integrations/printer/capacitor-plugin";

const CONNECTION_OPTIONS: { value: ConnectionType; label: string; icon: typeof Bluetooth }[] = [
  { value: "bluetooth", label: "Bluetooth", icon: Bluetooth },
  { value: "usb", label: "USB (OTG)", icon: Usb },
  { value: "ethernet", label: "Ethernet / WiFi", icon: Wifi },
];

type Props = {
  printer: PrinterConfig;
  updatePrinter: <K extends keyof PrinterConfig>(key: K, value: PrinterConfig[K]) => void;
  connecting: boolean;
  scanning: boolean;
  bluetoothDevices: BluetoothDevice[];
  selectedBluetoothDevice: BluetoothDevice | null;
  bluetoothOff: boolean;
  bluetoothPermissionDenied: boolean;
  onScanBluetooth: () => void;
  onConnectBluetooth: (device: BluetoothDevice) => void;
  scanningUsb: boolean;
  usbDevices: UsbDeviceInfo[];
  onScanUsb: () => void;
  onConnectUsb: (device: UsbDeviceInfo) => void;
  wifiInfo: WifiNetworkInfo | null;
  wifiUnavailable: boolean;
  onConnectEthernet: () => void;
  connectBluetoothManual: (address: string) => void;
};

export function PrinterConnectionCard({
  printer,
  updatePrinter,
  connecting,
  scanning,
  bluetoothDevices,
  selectedBluetoothDevice,
  bluetoothOff,
  bluetoothPermissionDenied,
  onScanBluetooth,
  onConnectBluetooth,
  scanningUsb,
  usbDevices,
  onScanUsb,
  onConnectUsb,
  wifiInfo,
  wifiUnavailable,
  onConnectEthernet,
  connectBluetoothManual,
}: Props) {
  return (
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
              onClick={onScanBluetooth}
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

            {bluetoothOff && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
                <p className="text-sm font-bold text-orange-700">Bluetooth tidak aktif</p>
                <p className="mt-1 text-xs text-orange-600">
                  Aktifkan Bluetooth untuk mencari printer thermal.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openBluetoothSettings}
                  className="mt-2"
                >
                  Buka Pengaturan Bluetooth
                </Button>
              </div>
            )}

            {bluetoothPermissionDenied && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <p className="text-sm font-bold text-red-700">Izin Bluetooth ditolak</p>
                <p className="mt-1 text-xs text-red-600">
                  Berikan izin Bluetooth dan lokasi di pengaturan aplikasi.
                </p>
                <Button variant="outline" size="sm" onClick={openAppSettings} className="mt-2">
                  Buka Pengaturan Aplikasi
                </Button>
              </div>
            )}

            {bluetoothDevices.length > 0 && (
              <div className="rounded-xl border">
                {bluetoothDevices.map((device) => (
                  <button
                    key={device.address}
                    onClick={() => onConnectBluetooth(device)}
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
                  onClick={() => connectBluetoothManual(printer.bluetoothAddress)}
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
              onClick={onScanUsb}
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
                    onClick={() => onConnectUsb(device)}
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

            {wifiInfo && !wifiUnavailable && (
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

            {wifiUnavailable && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
                <p className="text-sm font-bold text-orange-700">WiFi tidak terdeteksi</p>
                <p className="mt-1 text-xs text-orange-600">
                  Aktifkan dan hubungkan ke jaringan WiFi terlebih dahulu untuk menggunakan
                  koneksi Ethernet ke printer.
                </p>
                <Button variant="outline" size="sm" onClick={openWifiSettings} className="mt-2">
                  Buka Pengaturan WiFi
                </Button>
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
              onClick={onConnectEthernet}
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
  );
}
