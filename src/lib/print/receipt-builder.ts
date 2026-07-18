import type { StoreSettings } from "./types";

export interface OrderReceipt {
  order_code: string;
  customer_name: string;
  cashier_name: string;
  total_idr: number;
  amount_received: number;
  created_at: string;
  items: { name: string; price: number; quantity: number; subtotal: number }[];
}

export function buildReceiptData(order: OrderReceipt, store: StoreSettings) {
  const cashReceived = order.amount_received;
  return {
    orderCode: order.order_code,
    customerName: order.customer_name,
    cashierName: order.cashier_name,
    totalIdr: order.total_idr,
    cashReceived,
    change: cashReceived > 0 ? cashReceived - order.total_idr : 0,
    createdAt: order.created_at,
    items: order.items,
    store,
  };
}
