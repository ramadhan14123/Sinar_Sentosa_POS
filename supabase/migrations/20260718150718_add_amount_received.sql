ALTER TABLE public.orders ADD COLUMN amount_received integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id uuid, p_amount_received integer DEFAULT 0)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE; v_item record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order.status <> 'pending_payment' OR v_order.stock_deducted_at IS NOT NULL THEN RAISE EXCEPTION 'Pesanan tidak dapat dikonfirmasi'; END IF;
  FOR v_item IN SELECT oi.product_id, oi.quantity, p.name, p.stock FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id WHERE oi.order_id = p_order_id FOR UPDATE OF p LOOP
    IF v_item.stock < v_item.quantity THEN RAISE EXCEPTION 'Stok % tidak mencukupi', v_item.name; END IF;
    UPDATE public.products SET stock = stock - v_item.quantity WHERE id = v_item.product_id;
  END LOOP;
  UPDATE public.orders SET status = 'confirmed', stock_deducted_at = now(), amount_received = p_amount_received WHERE id = p_order_id;
END $$;

GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid, integer) TO authenticated;