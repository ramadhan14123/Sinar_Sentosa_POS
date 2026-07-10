// Type definitions for the native ThermalPrinter Capacitor plugin
// These mirror the methods in ThermalPrinterPlugin.java

export interface BluetoothDevice {
  name: string;
  address: string;
  paired: boolean;
}

export interface UsbDeviceInfo {
  deviceName: string;
  vendorId: number;
  productId: number;
  hasPermission: boolean;
}

export interface ConnectionStatus {
  status: "connected" | "disconnected" | "connecting" | "failed";
  type: "bluetooth" | "ethernet" | "usb" | "none";
}

export interface WifiNetworkInfo {
  ssid: string;
  ipAddress: string;
}

// Check if we're running in Capacitor native environment
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins: {
        ThermalPrinter: ThermalPrinterPluginDef;
      };
    };
  }
}

export function isNativePlatform(): boolean {
  return window.Capacitor?.isNativePlatform?.() ?? false;
}

// The plugin interface
export interface ThermalPrinterPluginDef {
  requestBluetoothPermissions(): Promise<{ granted: boolean }>;
  scanBluetoothDevices(): Promise<{ devices: BluetoothDevice[] }>;
  stopScan(): Promise<void>;
  connectBluetooth(options: { address: string }): Promise<{ success: boolean }>;
  scanUsbDevices(): Promise<{ devices: UsbDeviceInfo[] }>;
  requestUsbPermission(options: {
    vendorId: number;
    productId: number;
  }): Promise<{ success: boolean }>;
  connectEthernet(options: { ip: string; port: number }): Promise<{ success: boolean }>;
  sendData(options: { data: string }): Promise<{ success: boolean }>;
  disconnect(): Promise<void>;
  getConnectionStatus(): Promise<ConnectionStatus>;
  getWifiInfo(): Promise<WifiNetworkInfo>;
  testPrint(): Promise<{ success: boolean }>;
  openWifiSettings(): Promise<void>;
  openBluetoothSettings(): Promise<void>;
  openAppSettings(): Promise<void>;
  log(options: { message: string }): Promise<void>;
}

// Get native plugin (or mock for web)
export function getThermalPrinterPlugin(): ThermalPrinterPluginDef {
  if (isNativePlatform() && window.Capacitor?.Plugins?.ThermalPrinter) {
    return window.Capacitor.Plugins.ThermalPrinter;
  }
  return createMockPlugin();
}

// Mock plugin for web/testing — returns simulated data
function createMockPlugin(): ThermalPrinterPluginDef {
  let connected = false;
  let connectionType: "bluetooth" | "ethernet" | "none" = "none";

  return {
    async requestBluetoothPermissions() {
      console.log("[Mock] Bluetooth permissions granted");
      return { granted: true };
    },

    async scanBluetoothDevices() {
      console.log("[Mock] Scanning Bluetooth devices...");
      // Simulate delay
      await new Promise((r) => setTimeout(r, 1500));
      return {
        devices: [
          { name: "XPrinter XP-58 (Mock)", address: "00:11:22:33:44:55", paired: true },
          { name: "MTP-II (Mock)", address: "66:77:88:99:AA:BB", paired: false },
          { name: "POS-80 Thermal (Mock)", address: "AA:BB:CC:DD:EE:FF", paired: false },
          { name: "Bixolon SPP-R200 (Mock)", address: "12:34:56:78:9A:BC", paired: true },
        ],
      };
    },

    async stopScan() {
      console.log("[Mock] Scan stopped");
    },

    async connectBluetooth(options: { address: string }) {
      console.log(`[Mock] Connecting to Bluetooth: ${options.address}`);
      await new Promise((r) => setTimeout(r, 1000));
      connected = true;
      connectionType = "bluetooth";
      return { success: true };
    },

    async scanUsbDevices() {
      console.log("[Mock] Scanning USB devices...");
      return {
        devices: [
          {
            deviceName: "USB Printer (Mock)",
            vendorId: 0x0456,
            productId: 0x0808,
            hasPermission: false,
          },
        ],
      };
    },

    async requestUsbPermission(_options: { vendorId: number; productId: number }) {
      console.log("[Mock] USB permission granted");
      return { success: true };
    },

    async connectEthernet(options: { ip: string; port: number }) {
      console.log(`[Mock] Connecting to Ethernet: ${options.ip}:${options.port}`);
      await new Promise((r) => setTimeout(r, 1000));
      connected = true;
      connectionType = "ethernet";
      return { success: true };
    },

    async sendData(_options: { data: string }) {
      console.log(`[Mock] Sending ESC/POS data (${_options.data.length} bytes)`);
      await new Promise((r) => setTimeout(r, 500));
      return { success: true };
    },

    async disconnect() {
      console.log("[Mock] Disconnected");
      connected = false;
      connectionType = "none";
    },

    async getConnectionStatus() {
      return {
        status: connected ? ("connected" as const) : ("disconnected" as const),
        type: connectionType,
      };
    },

    async getWifiInfo() {
      return {
        ssid: "SinarSentosa-WiFi (Mock)",
        ipAddress: "192.168.1.100",
      };
    },

    async testPrint() {
      console.log("[Mock] Test print sent to printer");
      await new Promise((r) => setTimeout(r, 1000));
      return { success: true };
    },

    async openWifiSettings() {
      console.log("[Mock] Opening WiFi settings");
    },

    async openBluetoothSettings() {
      console.log("[Mock] Opening Bluetooth settings");
    },

    async openAppSettings() {
      console.log("[Mock] Opening app settings");
    },

    async log(options: { message: string }) {
      console.log("[Mock Log]", options.message);
    },
  };
}
