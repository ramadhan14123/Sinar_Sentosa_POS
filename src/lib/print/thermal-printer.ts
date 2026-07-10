import { EscPosEncoder } from "./esc-pos-encoder";
import { getThermalPrinterPlugin } from "./capacitor-plugin";
import type { PrinterConfig, ReceiptData, ConnectionStatus } from "./types";
import type { BluetoothDevice, UsbDeviceInfo, WifiNetworkInfo } from "./capacitor-plugin";

// Re-export for convenience
export type { BluetoothDevice, UsbDeviceInfo, WifiNetworkInfo };
export { getThermalPrinterPlugin } from "./capacitor-plugin";

const plugin = getThermalPrinterPlugin();

let cachedStatus: ConnectionStatus = { status: "disconnected", type: "none" };

export async function debugLog(message: string) {
  try {
    await plugin.log({ message });
  } catch {
    // fallback: silent
  }
}

export async function requestBluetoothPermissions(): Promise<boolean> {
  try {
    const result = await plugin.requestBluetoothPermissions();
    return result.granted;
  } catch (e) {
    console.error("[ThermalPrinter] Permission request failed", e);
    return false;
  }
}

export async function scanBluetoothDevices(): Promise<BluetoothDevice[]> {
  try {
    await requestBluetoothPermissions();
    const result = await plugin.scanBluetoothDevices();
    return result.devices;
  } catch (e) {
    console.error("[ThermalPrinter] Bluetooth scan failed", e);
    throw e;
  }
}

export async function stopScan(): Promise<void> {
  try {
    await plugin.stopScan();
  } catch (e) {
    console.error("[ThermalPrinter] Stop scan failed", e);
  }
}

export async function connectBluetooth(address: string): Promise<boolean> {
  try {
    const result = await plugin.connectBluetooth({ address });
    if (result.success) {
      cachedStatus = { status: "connected", type: "bluetooth" };
    }
    return result.success;
  } catch (e) {
    console.error("[ThermalPrinter] Bluetooth connect failed", e);
    cachedStatus = { status: "failed", type: "bluetooth" };
    return false;
  }
}

export async function scanUsbDevices(): Promise<UsbDeviceInfo[]> {
  try {
    const result = await plugin.scanUsbDevices();
    return result.devices;
  } catch (e) {
    console.error("[ThermalPrinter] USB scan failed", e);
    throw e;
  }
}

export async function requestUsbPermission(vendorId: number, productId: number): Promise<boolean> {
  try {
    const result = await plugin.requestUsbPermission({ vendorId, productId });
    return result.success;
  } catch {
    return false;
  }
}

export async function connectEthernet(ip: string, port: number): Promise<boolean> {
  try {
    const result = await plugin.connectEthernet({ ip, port });
    if (result.success) {
      cachedStatus = { status: "connected", type: "ethernet" };
    }
    return result.success;
  } catch (e) {
    console.error("[ThermalPrinter] Ethernet connect failed", e);
    cachedStatus = { status: "failed", type: "ethernet" };
    return false;
  }
}

export async function sendEscPosData(data: Uint8Array): Promise<boolean> {
  await debugLog(`[Thermal] sendEscPosData: payloadSize=${data.length} bytes`);
  try {
    const hex = Array.from(data)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    await debugLog(`[Thermal] sendEscPosData: hex.length=${hex.length} calling plugin.sendData`);
    const result = await plugin.sendData({ data: hex });
    await debugLog(`[Thermal] sendEscPosData: plugin result.success=${result.success}`);
    return result.success;
  } catch (e) {
    console.error("[ThermalPrinter] Send data failed", e);
    return false;
  }
}

export async function disconnect(): Promise<void> {
  try {
    await plugin.disconnect();
    cachedStatus = { status: "disconnected", type: "none" };
  } catch (e) {
    console.error("[ThermalPrinter] Disconnect failed", e);
  }
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  try {
    const status = await plugin.getConnectionStatus();
    cachedStatus = status;
    return status;
  } catch {
    return cachedStatus;
  }
}

export async function getWifiInfo(): Promise<WifiNetworkInfo | null> {
  try {
    await debugLog("[Thermal] getWifiInfo called");
    const info = await plugin.getWifiInfo();
    await debugLog(`[Thermal] getWifiInfo result: ${JSON.stringify(info)}`);
    return info;
  } catch (e) {
    await debugLog(`[Thermal] getWifiInfo error: ${e}`);
    return null;
  }
}

export async function testPrintThermal(): Promise<boolean> {
  try {
    const result = await plugin.testPrint();
    return result.success;
  } catch (e) {
    console.error("[ThermalPrinter] Test print failed", e);
    return false;
  }
}

export async function openWifiSettings(): Promise<void> {
  try {
    await plugin.openWifiSettings();
  } catch (e) {
    console.error("[ThermalPrinter] Open WiFi settings failed", e);
  }
}

export async function openBluetoothSettings(): Promise<void> {
  try {
    await plugin.openBluetoothSettings();
  } catch (e) {
    console.error("[ThermalPrinter] Open Bluetooth settings failed", e);
  }
}

export async function openAppSettings(): Promise<void> {
  try {
    await plugin.openAppSettings();
  } catch (e) {
    console.error("[ThermalPrinter] Open app settings failed", e);
  }
}

export async function printReceiptThermal(
  config: PrinterConfig,
  receipt: ReceiptData,
): Promise<boolean> {
  try {
    await debugLog("[Thermal] printReceiptThermal: building ESC/POS data");
    const encoder = new EscPosEncoder();
    const data = buildThermalReceipt(encoder, receipt).build();
    await debugLog(`[Thermal] printReceiptThermal: ESC/POS data built (${data.length} bytes), sending...`);
    const ok = await sendEscPosData(data);
    await debugLog(`[Thermal] printReceiptThermal: sendEscPosData returned ${ok}`);
    return ok;
  } catch (e) {
    console.error("[ThermalPrinter] printReceiptThermal exception", e);
    return false;
  }
}

export async function testConnection(config: PrinterConfig): Promise<boolean> {
  const status = await getConnectionStatus();
  if (status.status === "connected") return true;

  if (config.bluetoothAddress) {
    return await connectBluetooth(config.bluetoothAddress);
  }
  if (config.ipAddress) {
    return await connectEthernet(config.ipAddress, config.port);
  }

  return false;
}

function buildThermalReceipt(enc: EscPosEncoder, receipt: ReceiptData): EscPosEncoder {
  const { store } = receipt;

  enc.init().align("center").fontSize(2, 2).textLine(store.business_name).fontSize(1, 1);

  if (store.business_address) enc.textLine(store.business_address);
  if (store.business_phone) enc.textLine(`Telp: ${store.business_phone}`);
  enc.lineFeed();
  enc.hr();
  enc.align("center");
  enc.textLine("STRUK PEMBAYARAN");
  enc.hr();

  enc.align("left");
  enc.bold(true).text("No. ").bold(false).textLine(receipt.orderCode);
  enc.textLine(`Pelanggan: ${receipt.customerName}`);
  enc.textLine(`Tanggal: ${new Date(receipt.createdAt).toLocaleString("id-ID")}`);
  enc.hr();

  enc.bold(true).align("center").textLine("--- PESANAN ---").align("left").bold(false);
  enc.lineFeed();

  for (const item of receipt.items) {
    enc.bold(true).textLine(`${item.quantity}x ${item.name}`).bold(false);
    enc.row(
      `Rp${item.price.toLocaleString("id-ID")}/item`,
      `Rp${item.subtotal.toLocaleString("id-ID")}`,
    );
  }

  enc.hr();
  enc
    .bold(true)
    .row("TOTAL", `Rp${receipt.totalIdr.toLocaleString("id-ID")}`)
    .bold(false);
  enc.hr();

  enc.align("center");
  enc.textLine(receipt.store.footer_message);
  enc.lineFeed();

  if (receipt.store.show_wifi && receipt.store.wifi_ssid) {
    enc.textLine(`WiFi: ${receipt.store.wifi_ssid}`);
    enc.textLine(`Password: ${receipt.store.wifi_password}`);
  }
  if (receipt.store.show_instagram && receipt.store.instagram) {
    enc.textLine(`IG: ${receipt.store.instagram}`);
  }
  if (receipt.store.show_whatsapp && receipt.store.whatsapp) {
    enc.textLine(`WA: ${receipt.store.whatsapp}`);
  }

  enc.lineFeed(2);
  enc.cut();

  return enc;
}
