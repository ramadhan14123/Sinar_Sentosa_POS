CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT 'Sinar Sentosa' CHECK (char_length(trim(business_name)) BETWEEN 1 AND 100),
  business_address text NOT NULL DEFAULT '' CHECK (char_length(business_address) <= 500),
  business_phone text NOT NULL DEFAULT '' CHECK (char_length(business_phone) <= 30),
  wifi_ssid text NOT NULL DEFAULT '' CHECK (char_length(wifi_ssid) <= 50),
  wifi_password text NOT NULL DEFAULT '' CHECK (char_length(wifi_password) <= 50),
  instagram text NOT NULL DEFAULT '' CHECK (char_length(instagram) <= 100),
  whatsapp text NOT NULL DEFAULT '' CHECK (char_length(whatsapp) <= 30),
  website text NOT NULL DEFAULT '' CHECK (char_length(website) <= 200),
  footer_message text NOT NULL DEFAULT 'Terima kasih atas kunjungan Anda' CHECK (char_length(footer_message) <= 200),
  show_wifi boolean NOT NULL DEFAULT true,
  show_instagram boolean NOT NULL DEFAULT true,
  show_whatsapp boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read store settings" ON public.store_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Owners can insert store settings" ON public.store_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update store settings" ON public.store_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
      'show_wifi', true, 'show_instagram', true, 'show_whatsapp', false
    );
  END IF;
  RETURN row_to_json(v_settings)::jsonb;
END $$;

GRANT EXECUTE ON FUNCTION public.get_store_settings() TO authenticated;

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
      footer_message, show_wifi, show_instagram, show_whatsapp
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
      COALESCE((p_settings->>'show_whatsapp')::boolean, false)
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
      show_whatsapp = COALESCE((p_settings->>'show_whatsapp')::boolean, show_whatsapp)
    WHERE id = v_id
    RETURNING * INTO v_result;
  END IF;

  RETURN row_to_json(v_result)::jsonb;
END $$;

GRANT EXECUTE ON FUNCTION public.upsert_store_settings(jsonb) TO authenticated;
