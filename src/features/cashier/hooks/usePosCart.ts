import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStoreSettings } from "@/features/settings/services/settings.functions";
import { printReceipt } from "@/integrations/printer";
import type { StoreSettings } from "@/integrations/printer/types";
import { confirmPayment, getOrderById } from "@/features/cashier/services/cashier.functions";

type ProductItem = {
  id: string;
  name: string;
  price_idr: number;
  stock: number;
  image_url: string | null;
  category_id: string | null;
};

export function usePosCart(allProducts: ProductItem[]) {
  const queryClient = useQueryClient();
  const confirm = useServerFn(confirmPayment);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const items = allProducts
    .filter((p) => cart[p.id])
    .map((p) => ({ ...p, quantity: cart[p.id] }));

  const total = items.reduce((s, i) => s + i.price_idr * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  function updateQuantity(id: string, amount: number, maxStock: number) {
    setCart((old) => ({ ...old, [id]: Math.max(0, Math.min(maxStock, (old[id] ?? 0) + amount)) }));
  }

  async function submitOrder() {
    if (name.trim().length < 2) return toast.error("Isi nama pelanggan minimal 2 karakter.");
    if (!items.length) return toast.error("Keranjang masih kosong.");
    if (!cashReceived || Number(cashReceived) < total)
      return toast.error("Uang diterima kurang dari total.");

    setSubmitting(true);
    try {
      const { data: result, error } = await supabase.rpc("create_order", {
        p_customer_name: name.trim(),
        p_items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      });

      if (error || !result || typeof result !== "object" || Array.isArray(result))
        throw new Error(error?.message ?? "Pesanan gagal dibuat.");

      const orderId = String((result as Record<string, unknown>).order_id);
      await confirm({ data: { orderId, amountReceived: Number(cashReceived) } });

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const [orderData, storeData, profileResult] = await Promise.all([
        getOrderById({ data: { orderId } }),
        getStoreSettings(),
        userId
          ? supabase.from("profiles").select("full_name").eq("id", userId).single()
          : Promise.resolve({ data: null }),
      ]);
      const cashierName = profileResult?.data?.full_name ?? "Kasir";

      const printResult = await printReceipt(
        orderData as Record<string, any>,
        storeData as StoreSettings,
        cashierName,
      );

      if (printResult === "thermal") {
        toast.success("Struk sedang dicetak.");
      } else if (printResult === "pdf") {
        toast.info("Printer tidak tersedia. Pelanggan dapat mengunduh struk secara mandiri.");
      }

      toast.success(
        `Pesanan ${String((result as Record<string, unknown>).order_code)} dibuat & dibayar.`,
      );

      setCart({});
      setName("");
      setCashReceived("");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-orders"] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pesanan gagal dibuat.");
    } finally {
      setSubmitting(false);
    }
  }

  return {
    cart,
    items,
    total,
    count,
    name,
    setName,
    cashReceived,
    setCashReceived,
    updateQuantity,
    submitOrder,
    submitting,
  };
}
