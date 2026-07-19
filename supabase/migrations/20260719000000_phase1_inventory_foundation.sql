-- 20260719000000_phase1_inventory_foundation.sql

-- Enums
CREATE TYPE public.purchase_status AS ENUM ('draft', 'completed', 'cancelled');
CREATE TYPE public.stock_movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'waste', 'return');

-- 1. units
CREATE TABLE public.units (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    symbol text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. ingredient_categories
CREATE TABLE public.ingredient_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. ingredients
CREATE TABLE public.ingredients (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id uuid NOT NULL REFERENCES public.ingredient_categories(id) ON DELETE RESTRICT,
    unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    name text NOT NULL UNIQUE,
    sku text,
    current_stock numeric(18,3) NOT NULL DEFAULT 0,
    minimum_stock numeric(18,3) NOT NULL DEFAULT 0,
    average_cost numeric(18,2) NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. suppliers
CREATE TABLE public.suppliers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. purchase_orders
CREATE TABLE public.purchase_orders (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    invoice_number text NOT NULL,
    purchase_date timestamptz NOT NULL DEFAULT now(),
    total_amount numeric(18,2) NOT NULL DEFAULT 0,
    status public.purchase_status NOT NULL DEFAULT 'draft',
    notes text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. purchase_order_items
CREATE TABLE public.purchase_order_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    quantity numeric(18,3) NOT NULL CHECK (quantity > 0),
    unit_cost numeric(18,2) NOT NULL CHECK (unit_cost >= 0),
    subtotal numeric(18,2) NOT NULL CHECK (subtotal >= 0),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. product_recipes
CREATE TABLE public.product_recipes (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    quantity numeric(18,3) NOT NULL CHECK (quantity > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (product_id, ingredient_id)
);

-- 8. stock_movements
CREATE TABLE public.stock_movements (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    movement_type public.stock_movement_type NOT NULL,
    quantity numeric(18,3) NOT NULL,
    stock_before numeric(18,3) NOT NULL,
    stock_after numeric(18,3) NOT NULL,
    reference_type text,
    reference_id uuid,
    notes text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. ingredient_batches
CREATE TABLE public.ingredient_batches (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    purchase_order_item_id uuid NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE RESTRICT,
    quantity_received numeric(18,3) NOT NULL CHECK (quantity_received > 0),
    quantity_remaining numeric(18,3) NOT NULL CHECK (quantity_remaining >= 0),
    cost_per_unit numeric(18,2) NOT NULL CHECK (cost_per_unit >= 0),
    expired_at date,
    manufactured_at date,
    batch_number text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ingredients_category ON public.ingredients(category_id);
CREATE INDEX idx_ingredients_unit ON public.ingredients(unit_id);
CREATE INDEX idx_ingredients_active ON public.ingredients(is_active);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_po_items_po ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_ingredient ON public.purchase_order_items(ingredient_id);
CREATE INDEX idx_recipes_product ON public.product_recipes(product_id);
CREATE INDEX idx_recipes_ingredient ON public.product_recipes(ingredient_id);
CREATE INDEX idx_stock_movements_ingredient ON public.stock_movements(ingredient_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX idx_batches_ingredient ON public.ingredient_batches(ingredient_id);
CREATE INDEX idx_batches_po_item ON public.ingredient_batches(purchase_order_item_id);

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_units BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_ingredient_categories BEFORE UPDATE ON public.ingredient_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_ingredients BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_suppliers BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_purchase_orders BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable Publication for Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredients;

-- Seed Data (Units)
INSERT INTO public.units (name, symbol) VALUES
('Gram', 'g'),
('Kilogram', 'kg'),
('Milliliter', 'ml'),
('Liter', 'l'),
('Pieces', 'pcs')
ON CONFLICT (name) DO NOTHING;

-- Function: complete_purchase_order
CREATE OR REPLACE FUNCTION public.complete_purchase_order(p_purchase_order_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status public.purchase_status;
    v_item RECORD;
    v_stock_before numeric(18,3);
    v_stock_after numeric(18,3);
    v_total_value_before numeric(18,2);
    v_new_average_cost numeric(18,2);
BEGIN
    -- Get current status with lock
    SELECT status INTO v_status 
    FROM public.purchase_orders 
    WHERE id = p_purchase_order_id FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Purchase order tidak ditemukan.';
    END IF;

    IF v_status != 'draft' THEN
        RAISE EXCEPTION 'Hanya purchase order draft yang dapat diselesaikan.';
    END IF;

    -- Process each item
    FOR v_item IN (SELECT * FROM public.purchase_order_items WHERE purchase_order_id = p_purchase_order_id) LOOP
        -- Lock ingredient
        SELECT current_stock, average_cost INTO v_stock_before, v_total_value_before
        FROM public.ingredients 
        WHERE id = v_item.ingredient_id FOR UPDATE;

        -- Calculate total value before
        v_total_value_before := v_total_value_before * v_stock_before;
        v_stock_after := v_stock_before + v_item.quantity;

        -- Calculate new average cost
        IF v_stock_after > 0 THEN
            v_new_average_cost := (v_total_value_before + (v_item.quantity * v_item.unit_cost)) / v_stock_after;
        ELSE
            v_new_average_cost := v_item.unit_cost;
        END IF;

        -- Update stock and average cost
        UPDATE public.ingredients 
        SET current_stock = v_stock_after,
            average_cost = v_new_average_cost
        WHERE id = v_item.ingredient_id;

        -- Insert stock movement
        INSERT INTO public.stock_movements (
            ingredient_id, movement_type, quantity, stock_before, stock_after, 
            reference_type, reference_id, created_by
        ) VALUES (
            v_item.ingredient_id, 'purchase', v_item.quantity, v_stock_before, v_stock_after,
            'purchase_order', p_purchase_order_id, p_user_id
        );

        -- Insert ingredient batch
        INSERT INTO public.ingredient_batches (
            ingredient_id, purchase_order_item_id, quantity_received, quantity_remaining, cost_per_unit
        ) VALUES (
            v_item.ingredient_id, v_item.id, v_item.quantity, v_item.quantity, v_item.unit_cost
        );
    END LOOP;

    -- Update purchase order status
    UPDATE public.purchase_orders 
    SET status = 'completed'
    WHERE id = p_purchase_order_id;
END;
$$;

-- Function: cancel_purchase_order
CREATE OR REPLACE FUNCTION public.cancel_purchase_order(p_purchase_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status public.purchase_status;
BEGIN
    -- Get current status with lock
    SELECT status INTO v_status 
    FROM public.purchase_orders 
    WHERE id = p_purchase_order_id FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Purchase order tidak ditemukan.';
    END IF;

    IF v_status != 'draft' THEN
        RAISE EXCEPTION 'Hanya purchase order draft yang dapat dibatalkan.';
    END IF;

    -- Update status
    UPDATE public.purchase_orders 
    SET status = 'cancelled'
    WHERE id = p_purchase_order_id;
END;
$$;
