-- Menambahkan konfigurasi limitasi pengeluaran ke tabel store_settings

ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS expense_limit_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS expense_limit_period text NOT NULL DEFAULT 'monthly' CHECK (expense_limit_period IN ('daily', 'monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS expense_limit_amount numeric(18,2) NOT NULL DEFAULT 0;

-- Comment for table columns
COMMENT ON COLUMN public.store_settings.expense_limit_enabled IS 'Apakah limitasi pengeluaran diaktifkan';
COMMENT ON COLUMN public.store_settings.expense_limit_period IS 'Periode limitasi pengeluaran: daily, monthly, atau yearly';
COMMENT ON COLUMN public.store_settings.expense_limit_amount IS 'Nominal batas maksimal pengeluaran per periode';

CREATE OR REPLACE FUNCTION public.get_store_settings()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_settings public.store_settings;
BEGIN
  SELECT * INTO v_settings FROM public.store_settings ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'id', NULL::uuid, 'business_name', 'Sinar Sentosa', 'business_address', '',
      'business_phone', '', 'wifi_ssid', '', 'wifi_password', '',
      'instagram', '', 'whatsapp', '', 'website', '',
      'footer_message', 'Terima kasih atas kunjungan Anda',
      'show_wifi', true, 'show_instagram', true, 'show_whatsapp', false,
      'expense_limit_enabled', false, 'expense_limit_period', 'monthly', 'expense_limit_amount', 0
    );
  END IF;
  RETURN row_to_json(v_settings)::jsonb;
END $$;

CREATE OR REPLACE FUNCTION public.upsert_store_settings(p_settings jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_result public.store_settings;
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN RAISE EXCEPTION 'Akses ditolak'; END IF;

  SELECT id INTO v_id FROM public.store_settings ORDER BY created_at DESC LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.store_settings(
      business_name, business_address, business_phone,
      wifi_ssid, wifi_password, instagram, whatsapp, website,
      footer_message, show_wifi, show_instagram, show_whatsapp,
      expense_limit_enabled, expense_limit_period, expense_limit_amount
    ) VALUES (
      COALESCE(p_settings->>'business_name', 'Sinar Sentosa'),
      COALESCE(p_settings->>'business_address', ''),
      COALESCE(p_settings->>'business_phone', ''),
      COALESCE(p_settings->>'wifi_ssid', ''),
      COALESCE(p_settings->>'wifi_password', ''),
      COALESCE(p_settings->>'instagram', ''),
      COALESCE(p_settings->>'whatsapp', ''),
      COALESCE(p_settings->>'website', ''),
      COALESCE(p_settings->>'footer_message', 'Terima kasih atas kunjungan Anda'),
      COALESCE((p_settings->>'show_wifi')::boolean, true),
      COALESCE((p_settings->>'show_instagram')::boolean, true),
      COALESCE((p_settings->>'show_whatsapp')::boolean, false),
      COALESCE((p_settings->>'expense_limit_enabled')::boolean, false),
      COALESCE(p_settings->>'expense_limit_period', 'monthly'),
      COALESCE((p_settings->>'expense_limit_amount')::numeric, 0)
    ) RETURNING * INTO v_result;
  ELSE
    UPDATE public.store_settings SET
      business_name = COALESCE(p_settings->>'business_name', business_name),
      business_address = COALESCE(p_settings->>'business_address', business_address),
      business_phone = COALESCE(p_settings->>'business_phone', business_phone),
      wifi_ssid = COALESCE(p_settings->>'wifi_ssid', wifi_ssid),
      wifi_password = COALESCE(p_settings->>'wifi_password', wifi_password),
      instagram = COALESCE(p_settings->>'instagram', instagram),
      whatsapp = COALESCE(p_settings->>'whatsapp', whatsapp),
      website = COALESCE(p_settings->>'website', website),
      footer_message = COALESCE(p_settings->>'footer_message', footer_message),
      show_wifi = COALESCE((p_settings->>'show_wifi')::boolean, show_wifi),
      show_instagram = COALESCE((p_settings->>'show_instagram')::boolean, show_instagram),
      show_whatsapp = COALESCE((p_settings->>'show_whatsapp')::boolean, show_whatsapp),
      expense_limit_enabled = COALESCE((p_settings->>'expense_limit_enabled')::boolean, expense_limit_enabled),
      expense_limit_period = COALESCE(p_settings->>'expense_limit_period', expense_limit_period),
      expense_limit_amount = COALESCE((p_settings->>'expense_limit_amount')::numeric, expense_limit_amount)
    WHERE id = v_id
    RETURNING * INTO v_result;
  END IF;

  RETURN row_to_json(v_result)::jsonb;
END $$;
