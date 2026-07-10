import { loadPrinterConfig } from "./printer-store";
import { printReceiptThermal, testConnection } from "./thermal-printer";
import { buildReceiptData, type OrderReceipt } from "./receipt-builder";
import type { ReceiptData, StoreSettings } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOrder(raw: Record<string, any>): OrderReceipt {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (raw.order_items ?? []).map((i: Record<string, any>) => ({
    name: i.product_name_snapshot ?? "",
    price: i.price_snapshot ?? 0,
    quantity: i.quantity ?? 0,
    subtotal: i.subtotal ?? 0,
  }));
  return {
    order_code: raw.order_code ?? "",
    customer_name: raw.customer_name ?? "",
    total_idr: raw.total_idr ?? 0,
    created_at: raw.created_at ?? "",
    items,
  };
}

export async function printReceipt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawOrder: Record<string, any>,
  store: StoreSettings,
): Promise<"thermal" | "pdf" | "none"> {
  const order = mapOrder(rawOrder);
  const config = loadPrinterConfig();

  if (config.autoPrint && (config.bluetoothAddress || config.ipAddress)) {
    const connected = await testConnection(config);
    if (connected) {
      const receipt: ReceiptData = buildReceiptData(order, store);
      const ok = await printReceiptThermal(config, receipt);
      if (ok) return "thermal";
    }
    console.log("[PrintManager] Thermal unavailable — falling back to PDF");
  }

  return "pdf";
}
