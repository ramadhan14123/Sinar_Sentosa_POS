import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getStoreSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_store_settings");
    if (error) throw new Error("Gagal memuat pengaturan toko.");
    return data as Record<string, unknown>;
  });

const settingsSchema = z.object({
  business_name: z.string().trim().min(1).max(100),
  business_address: z.string().trim().max(500),
  business_phone: z.string().trim().max(30),
  wifi_ssid: z.string().trim().max(50),
  wifi_password: z.string().trim().max(50),
  instagram: z.string().trim().max(100),
  whatsapp: z.string().trim().max(30),
  website: z.string().trim().max(200),
  footer_message: z.string().trim().max(200),
  show_wifi: z.boolean(),
  show_instagram: z.boolean(),
  show_whatsapp: z.boolean(),
});

export const upsertStoreSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("upsert_store_settings", {
      p_settings: data,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
