export type ConnectionType = "bluetooth" | "usb" | "ethernet";

export interface PrinterConfig {
  connectionType: ConnectionType;
  printerName: string;
  bluetoothAddress: string;
  ipAddress: string;
  port: number;
  autoPrint: boolean;
}

export interface ConnectionStatus {
  status: "connected" | "disconnected" | "connecting" | "failed";
  type: "bluetooth" | "ethernet" | "usb" | "none";
}

export interface StoreSettings {
  id: string | null;
  business_name: string;
  business_address: string;
  business_phone: string;
  wifi_ssid: string;
  wifi_password: string;
  instagram: string;
  whatsapp: string;
  website: string;
  footer_message: string;
  show_wifi: boolean;
  show_instagram: boolean;
  show_whatsapp: boolean;
}

export interface ReceiptData {
  orderCode: string;
  customerName: string;
  totalIdr: number;
  createdAt: string;
  items: { name: string; price: number; quantity: number; subtotal: number }[];
  store: StoreSettings;
}
