CREATE TYPE public.app_role AS ENUM ('owner', 'cashier');
CREATE TYPE public.order_status AS ENUM ('pending_payment', 'confirmed', 'processing', 'completed', 'cancelled');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  price_idr integer NOT NULL CHECK (price_idr > 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text CHECK (image_url IS NULL OR char_length(image_url) <= 1000),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE,
  tracking_token uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_name text NOT NULL CHECK (char_length(trim(customer_name)) BETWEEN 2 AND 80),
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  total_idr integer NOT NULL CHECK (total_idr > 0),
  stock_deducted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_code, tracking_token)
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name_snapshot text NOT NULL,
  price_snapshot integer NOT NULL CHECK (price_snapshot > 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  subtotal integer NOT NULL CHECK (subtotal > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'owner') OR public.has_role(_user_id, 'cashier')
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

CREATE POLICY "Staff can read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Owners manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Users read own role or owners read all" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Public reads categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Public reads active products" ON public.products FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated reads products" ON public.products FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR is_active = true);
CREATE POLICY "Owners manage products" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Staff reads orders" ON public.orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff updates orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff reads order items" ON public.order_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_order(p_customer_name text, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id uuid := gen_random_uuid();
  v_code text := 'ORD-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_token uuid := gen_random_uuid();
  v_total integer := 0;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty integer;
BEGIN
  IF char_length(trim(p_customer_name)) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'Nama pelanggan tidak valid'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 30 THEN RAISE EXCEPTION 'Keranjang tidak valid'; END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Jumlah item tidak valid'; END IF;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid AND is_active = true FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produk tidak tersedia'; END IF;
    IF v_product.stock < v_qty THEN RAISE EXCEPTION 'Stok % tidak mencukupi', v_product.name; END IF;
    v_total := v_total + (v_product.price_idr * v_qty);
  END LOOP;
  INSERT INTO public.orders(id, order_code, tracking_token, customer_name, total_idr) VALUES (v_order_id, v_code, v_token, trim(p_customer_name), v_total);
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::integer;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    INSERT INTO public.order_items(order_id, product_id, product_name_snapshot, price_snapshot, quantity, subtotal)
    VALUES (v_order_id, v_product.id, v_product.name, v_product.price_idr, v_qty, v_product.price_idr * v_qty);
  END LOOP;
  RETURN jsonb_build_object('order_code', v_code, 'tracking_token', v_token, 'order_id', v_order_id);
END $$;
GRANT EXECUTE ON FUNCTION public.create_order(text, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_order_by_code(p_order_code text, p_tracking_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', o.id, 'order_code', o.order_code, 'customer_name', o.customer_name, 'status', o.status,
    'total_idr', o.total_idr, 'created_at', o.created_at,
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', oi.product_name_snapshot, 'price', oi.price_snapshot, 'quantity', oi.quantity, 'subtotal', oi.subtotal) ORDER BY oi.created_at) FROM public.order_items oi WHERE oi.order_id = o.id), '[]'::jsonb)
  ) FROM public.orders o WHERE o.order_code = p_order_code AND o.tracking_token = p_tracking_token
$$;
GRANT EXECUTE ON FUNCTION public.get_order_by_code(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id uuid)
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
  UPDATE public.orders SET status = 'confirmed', stock_deducted_at = now() WHERE id = p_order_id;
END $$;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id uuid, p_new_status public.order_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_current public.order_status;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  SELECT status INTO v_current FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF (v_current = 'confirmed' AND p_new_status = 'processing') OR (v_current = 'processing' AND p_new_status = 'completed') OR (v_current = 'pending_payment' AND p_new_status = 'cancelled') THEN
    UPDATE public.orders SET status = p_new_status WHERE id = p_order_id;
  ELSE RAISE EXCEPTION 'Transisi status tidak valid'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, public.order_status) TO authenticated;

CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_active_idx ON public.products(is_active);
CREATE INDEX orders_status_created_idx ON public.orders(status, created_at DESC);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;