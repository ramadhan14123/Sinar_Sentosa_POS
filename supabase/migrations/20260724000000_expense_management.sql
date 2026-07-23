-- 20260724000000_expense_management.sql
-- Phase 1.5: Expense Management, Approval Workflow & Storage Retention

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE public.expense_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- 2a. Expense Categories
CREATE TABLE public.expense_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2b. Expenses
CREATE TABLE public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id uuid NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    merchant text NOT NULL CHECK (char_length(trim(merchant)) BETWEEN 1 AND 200),
    receipt_number text,
    receipt_date date NOT NULL,
    amount numeric(18,2) NOT NULL CHECK (amount > 0),
    description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 1 AND 1000),
    status public.expense_status NOT NULL DEFAULT 'submitted',
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at timestamptz,
    rejection_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2c. Expense Receipts (file metadata)
CREATE TABLE public.expense_receipts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    storage_path text NOT NULL, -- path in Supabase Storage: {user_id}/{year}/{month}/{expense_id}.jpg
    file_size_bytes integer,
    mime_type text NOT NULL DEFAULT 'image/jpeg',
    storage_tier text NOT NULL DEFAULT 'active', -- 'active' | 'cold' | 'deleted'
    moved_to_cold_at timestamptz,
    deleted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2d. Expense Audit Log (immutable)
CREATE TABLE public.expense_audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE RESTRICT,
    actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL, -- 'submitted' | 'approved' | 'rejected' | 'cleanup_moved' | 'cleanup_deleted'
    notes text,
    metadata jsonb, -- additional context (e.g. old_status, new_status, file counts)
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. EXTEND store_settings WITH RETENTION COLUMNS
-- ============================================================================
-- receipt_active_days:  days file stays in active storage (default 14)
-- receipt_cold_days:    days file stays in cold storage (default 21)  
-- receipt_delete_days:  days after which file is permanently deleted (default 30)
-- cashier_see_all_expenses: whether cashier can see all expenses or only their own

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'store_settings' 
        AND column_name = 'receipt_active_days'
    ) THEN
        ALTER TABLE public.store_settings 
            ADD COLUMN receipt_active_days integer NOT NULL DEFAULT 14 CHECK (receipt_active_days > 0),
            ADD COLUMN receipt_cold_days integer NOT NULL DEFAULT 21,
            ADD COLUMN receipt_delete_days integer NOT NULL DEFAULT 30,
            ADD COLUMN cashier_see_all_expenses boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX idx_expenses_category ON public.expenses(category_id);
CREATE INDEX idx_expenses_submitted_by ON public.expenses(submitted_by);
CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_expenses_receipt_date ON public.expenses(receipt_date);
CREATE INDEX idx_expense_receipts_expense ON public.expense_receipts(expense_id);
CREATE INDEX idx_expense_receipts_tier ON public.expense_receipts(storage_tier);
CREATE INDEX idx_expense_receipts_created ON public.expense_receipts(created_at);
CREATE INDEX idx_expense_audit_logs_expense ON public.expense_audit_logs(expense_id);

-- ============================================================================
-- 5. TRIGGERS (updated_at)
-- ============================================================================

CREATE TRIGGER set_updated_at_expense_categories 
    BEFORE UPDATE ON public.expense_categories 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_expenses 
    BEFORE UPDATE ON public.expenses 
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.expense_categories TO authenticated;
GRANT DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

GRANT SELECT, INSERT ON public.expense_receipts TO authenticated;
GRANT ALL ON public.expense_receipts TO service_role;

GRANT SELECT, INSERT ON public.expense_audit_logs TO authenticated;
GRANT ALL ON public.expense_audit_logs TO service_role;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_audit_logs ENABLE ROW LEVEL SECURITY;

-- expense_categories: All staff can read, only owners manage
CREATE POLICY "Staff reads expense_categories" ON public.expense_categories 
    FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owners manage expense_categories" ON public.expense_categories 
    FOR ALL TO authenticated 
    USING (public.has_role(auth.uid(), 'owner')) 
    WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- expenses: cashier sees own or all (based on store setting), owner sees all
CREATE POLICY "Cashiers manage own expenses" ON public.expenses 
    FOR ALL TO authenticated 
    USING (
        submitted_by = auth.uid() 
        OR public.has_role(auth.uid(), 'owner')
        OR (
            public.has_role(auth.uid(), 'cashier')
            AND EXISTS (
                SELECT 1 FROM public.store_settings 
                WHERE cashier_see_all_expenses = true
            )
        )
    )
    WITH CHECK (
        submitted_by = auth.uid()
        OR public.has_role(auth.uid(), 'owner')
    );

-- expense_receipts: follow expense access
CREATE POLICY "Staff reads own expense receipts" ON public.expense_receipts 
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id
            AND (
                e.submitted_by = auth.uid() 
                OR public.has_role(auth.uid(), 'owner')
                OR (
                    public.has_role(auth.uid(), 'cashier')
                    AND EXISTS (SELECT 1 FROM public.store_settings WHERE cashier_see_all_expenses = true)
                )
            )
        )
    );
CREATE POLICY "Staff inserts own expense receipts" ON public.expense_receipts 
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id AND e.submitted_by = auth.uid()
        )
        OR public.has_role(auth.uid(), 'owner')
    );

-- expense_audit_logs: readable by staff with expense access, immutable (no update/delete via RLS)
CREATE POLICY "Staff reads expense audit logs" ON public.expense_audit_logs 
    FOR SELECT TO authenticated 
    USING (
        public.is_staff(auth.uid())
    );
CREATE POLICY "Staff inserts expense audit logs" ON public.expense_audit_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (public.is_staff(auth.uid()));

-- ============================================================================
-- 8. STORAGE BUCKET: expense-receipts
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'expense-receipts', 
    'expense-receipts', 
    false,  -- private bucket
    2097152, -- 2MB max
    ARRAY['image/jpeg', 'image/webp', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated staff can upload their own receipts
CREATE POLICY "Staff uploads own receipts" ON storage.objects 
    FOR INSERT TO authenticated 
    WITH CHECK (
        bucket_id = 'expense-receipts'
        AND public.is_staff(auth.uid())
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Staff reads own receipts" ON storage.objects 
    FOR SELECT TO authenticated 
    USING (
        bucket_id = 'expense-receipts'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.has_role(auth.uid(), 'owner')
        )
    );

CREATE POLICY "Service role manages receipts" ON storage.objects
    FOR ALL TO service_role
    USING (bucket_id = 'expense-receipts')
    WITH CHECK (bucket_id = 'expense-receipts');

-- ============================================================================
-- 9. SEED: Default Expense Categories
-- ============================================================================

INSERT INTO public.expense_categories (name, description) VALUES
    ('ATK', 'Alat tulis kantor dan kebutuhan administrasi'),
    ('Transportasi', 'Biaya transportasi operasional'),
    ('Maintenance', 'Perbaikan dan pemeliharaan peralatan'),
    ('Listrik', 'Tagihan listrik'),
    ('Air', 'Tagihan air'),
    ('Internet', 'Tagihan internet dan komunikasi'),
    ('Konsumsi', 'Konsumsi staf dan tamu'),
    ('Peralatan', 'Pembelian peralatan operasional'),
    ('Kebersihan', 'Perlengkapan dan layanan kebersihan'),
    ('Lainnya', 'Pengeluaran lain-lain')
ON CONFLICT (name) DO NOTHING;
