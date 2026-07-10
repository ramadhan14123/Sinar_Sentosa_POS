import { loadPrinterConfig } from "./printer-store";
import { printReceiptThermal, debugLog } from "./thermal-printer";
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
    cashier_name: "",
    total_idr: raw.total_idr ?? 0,
    created_at: raw.created_at ?? "",
    items,
  };
}

export async function printReceipt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawOrder: Record<string, any>,
  store: StoreSettings,
  cashierName: string,
): Promise<"thermal" | "pdf" | "none"> {
  const order: OrderReceipt = { ...mapOrder(rawOrder), cashier_name: cashierName };
  const config = loadPrinterConfig();

  await debugLog(
    `[PRINT] Config: autoPrint=${config.autoPrint} btAddr=${config.bluetoothAddress || "(empty)"} ip=${config.ipAddress || "(empty)"} port=${config.port} printer=${config.printerName || "(empty)"}`,
  );

  if (config.autoPrint && (config.bluetoothAddress || config.ipAddress)) {
    await debugLog("[PRINT] Thermal Branch Entered");
    const receipt: ReceiptData = buildReceiptData(order, store);
    const ok = await printReceiptThermal(config, receipt);
    await debugLog(`[PRINT] printReceiptThermal result: ${ok}`);
    if (ok) {
      await debugLog("[PRINT] Thermal Success");
      return "thermal";
    }
  } else {
    await debugLog(
      `[PRINT] Thermal condition not met: autoPrint=${config.autoPrint} btAddr=${config.bluetoothAddress || "(empty)"} ip=${config.ipAddress || "(empty)"}`,
    );
  }

  await debugLog("[PRINT] Fallback To PDF");
  return "pdf";
}
