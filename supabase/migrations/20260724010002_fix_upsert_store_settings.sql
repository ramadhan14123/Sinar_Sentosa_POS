-- Fix upsert_store_settings signature to use jsonb parameter
-- Drop wrong function signatures
DROP FUNCTION IF EXISTS public.upsert_store_settings(integer, numeric, numeric, numeric, time);
DROP FUNCTION IF EXISTS public.upsert_store_settings(integer, numeric, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.upsert_store_settings(jsonb);

-- Create correct function with jsonb
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
      expense_limit_enabled, expense_limit_period, expense_limit_amount,
      expense_limit_reset_time, receipt_active_days, receipt_cold_days,
      receipt_delete_days, cashier_see_all_expenses
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
      COALESCE((p_settings->>'expense_limit_amount')::numeric, 0),
      COALESCE((p_settings->>'expense_limit_reset_time')::time, '00:00:00'::time),
      COALESCE((p_settings->>'receipt_active_days')::integer, 14),
      COALESCE((p_settings->>'receipt_cold_days')::integer, 21),
      COALESCE((p_settings->>'receipt_delete_days')::integer, 30),
      COALESCE((p_settings->>'cashier_see_all_expenses')::boolean, false)
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
      expense_limit_amount = COALESCE((p_settings->>'expense_limit_amount')::numeric, expense_limit_amount),
      expense_limit_reset_time = COALESCE((p_settings->>'expense_limit_reset_time')::time, expense_limit_reset_time),
      receipt_active_days = COALESCE((p_settings->>'receipt_active_days')::integer, receipt_active_days),
      receipt_cold_days = COALESCE((p_settings->>'receipt_cold_days')::integer, receipt_cold_days),
      receipt_delete_days = COALESCE((p_settings->>'receipt_delete_days')::integer, receipt_delete_days),
      cashier_see_all_expenses = COALESCE((p_settings->>'cashier_see_all_expenses')::boolean, cashier_see_all_expenses),
      updated_at = NOW()
    WHERE id = v_id
    RETURNING * INTO v_result;
  END IF;

  RETURN row_to_json(v_result)::jsonb;
END $$;

GRANT EXECUTE ON FUNCTION public.upsert_store_settings(jsonb) TO authenticated;
