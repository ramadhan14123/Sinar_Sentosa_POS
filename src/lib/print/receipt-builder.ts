import type { StoreSettings } from "./types";

export interface OrderReceipt {
  order_code: string;
  customer_name: string;
  total_idr: number;
  created_at: string;
  items: { name: string; price: number; quantity: number; subtotal: number }[];
}

export function buildReceiptData(order: OrderReceipt, store: StoreSettings) {
  return {
    orderCode: order.order_code,
    customerName: order.customer_name,
    totalIdr: order.total_idr,
    createdAt: order.created_at,
    items: order.items,
    store,
  };
}
