import { useEffect, useState } from "react";
import { toast } from "sonner";
import { loadPrinterConfig, savePrinterConfig } from "@/integrations/printer/printer-store";
import {
  scanBluetoothDevices,
  connectBluetooth,
  scanUsbDevices,
  requestUsbPermission,
  connectEthernet,
  getConnectionStatus,
  testPrintThermal,
  getWifiInfo,
  disconnect,
  openCashDrawer,
} from "@/integrations/printer/thermal-printer";
import type { PrinterConfig } from "@/integrations/printer/types";
import type {
  BluetoothDevice,
  UsbDeviceInfo,
  WifiNetworkInfo,
} from "@/integrations/printer/capacitor-plugin";

export function usePrinterConnection() {
  const [printer, setPrinter] = useState<PrinterConfig>(loadPrinterConfig);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "failed"
  >("disconnected");
  const [connectionType, setConnectionType] = useState<"bluetooth" | "ethernet" | "usb" | "none">(
    "none",
  );

  // Bluetooth state
  const [scanning, setScanning] = useState(false);
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>([]);
  const [selectedBluetoothDevice, setSelectedBluetoothDevice] = useState<BluetoothDevice | null>(null);
  const [bluetoothOff, setBluetoothOff] = useState(false);
  const [bluetoothPermissionDenied, setBluetoothPermissionDenied] = useState(false);

  // USB state
  const [scanningUsb, setScanningUsb] = useState(false);
  const [usbDevices, setUsbDevices] = useState<UsbDeviceInfo[]>([]);

  // Ethernet state
  const [wifiInfo, setWifiInfo] = useState<WifiNetworkInfo | null>(null);
  const [wifiUnavailable, setWifiUnavailable] = useState(false);

  // Action / test loading state
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [testingDrawer, setTestingDrawer] = useState(false);

  useEffect(() => {
    getConnectionStatus().then((s) => {
      setConnectionStatus(s.status);
      setConnectionType(s.type);
    });
    getWifiInfo()
      .then((info) => {
        setWifiInfo(info);
        if (!info || !info.ssid) setWifiUnavailable(true);
        else setWifiUnavailable(false);
      })
      .catch(() => setWifiUnavailable(true));
  }, []);

  function updatePrinter<K extends keyof PrinterConfig>(key: K, value: PrinterConfig[K]) {
    const next = { ...printer, [key]: value };
    setPrinter(next);
    savePrinterConfig(next);
  }

  async function handleScanBluetooth() {
    setScanning(true);
    setBluetoothDevices([]);
    setBluetoothOff(false);
    setBluetoothPermissionDenied(false);
    try {
      const devices = await scanBluetoothDevices();
      setBluetoothDevices(devices);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("Bluetooth is not enabled")) {
        setBluetoothOff(true);
      } else if (msg.includes("permission")) {
        setBluetoothPermissionDenied(true);
      } else {
        toast.error(msg || "Gagal memindai Bluetooth.");
      }
    } finally {
      setScanning(false);
    }
  }

  async function handleConnectBluetooth(device: BluetoothDevice) {
    setSelectedBluetoothDevice(device);
    setConnecting(true);
    setConnectionStatus("connecting");
    try {
      setPrinter((prev) => {
        const next = { ...prev, bluetoothAddress: device.address, printerName: device.name };
        savePrinterConfig(next);
        return next;
      });
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

  async function handleTestCashDrawer() {
    setTestingDrawer(true);
    try {
      const ok = await openCashDrawer();
      if (ok) {
        toast.success("Cash drawer terbuka.");
      } else {
        toast.error("Cash drawer gagal.");
      }
    } catch {
      toast.error("Cash drawer gagal.");
    } finally {
      setTestingDrawer(false);
    }
  }

  async function handleDisconnect() {
    await disconnect();
    setConnectionStatus("disconnected");
    setConnectionType("none");
    setSelectedBluetoothDevice(null);
    toast.success("Printer diputuskan.");
  }

  return {
    printer,
    updatePrinter,
    connectionStatus,
    connectionType,
    selectedBluetoothDevice,
    scanning,
    bluetoothDevices,
    bluetoothOff,
    bluetoothPermissionDenied,
    handleScanBluetooth,
    handleConnectBluetooth,
    scanningUsb,
    usbDevices,
    handleScanUsb,
    handleConnectUsb,
    wifiInfo,
    wifiUnavailable,
    handleConnectEthernet,
    connecting,
    testing,
    testPrinting,
    testingDrawer,
    handleTestConnection,
    handleTestPrint,
    handleTestCashDrawer,
    handleDisconnect,
  };
}
