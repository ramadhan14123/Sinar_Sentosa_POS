import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Computer, Loader2, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { useActionGuard } from "@/shared/hooks/use-action-guard";
import { getStoreSettings, upsertStoreSettings } from "@/features/settings/services/settings.functions";
import type { StoreSettings } from "@/integrations/printer/types";

export function StoreInfoForm() {
  const queryClient = useQueryClient();
  const storeQuery = useQuery({ queryKey: ["store-settings"], queryFn: () => getStoreSettings() });
  const saveSettings = useServerFn(upsertStoreSettings);

  const [store, setStore] = useState<Partial<StoreSettings>>({});
  const [storeLoaded, setStoreLoaded] = useState(false);
  const { saving, guard } = useActionGuard();

  if (storeQuery.data && !storeLoaded) {
    setStore(storeQuery.data as Partial<StoreSettings>);
    setStoreLoaded(true);
  }

  function updateStore(key: string, value: string | boolean) {
    setStore((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveStore() {
    await guard(async () => {
      try {
        await saveSettings({ data: store as Partial<StoreSettings> });
        toast.success("Pengaturan toko disimpan.");
        await queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengaturan.");
      }
    });
  }

  return (
    <section className="rounded-3xl border bg-background p-6 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
        <Computer className="size-5" /> Informasi Toko
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Data ini akan muncul pada struk pembayaran.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="business-name">Nama Usaha</Label>
          <Input
            id="business-name"
            value={store.business_name ?? ""}
            onChange={(e) => updateStore("business_name", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="business-address">Alamat</Label>
          <Input
            id="business-address"
            value={store.business_address ?? ""}
            onChange={(e) => updateStore("business_address", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="business-phone">Telepon</Label>
          <Input
            id="business-phone"
            value={store.business_phone ?? ""}
            onChange={(e) => updateStore("business_phone", e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="wifi-ssid">WiFi SSID</Label>
            <Input
              id="wifi-ssid"
              value={store.wifi_ssid ?? ""}
              onChange={(e) => updateStore("wifi_ssid", e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="wifi-password">WiFi Password</Label>
            <Input
              id="wifi-password"
              value={store.wifi_password ?? ""}
              onChange={(e) => updateStore("wifi_password", e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border p-4">
          <p className="text-sm font-bold">Tampilkan WiFi di struk</p>
          <Switch
            checked={store.show_wifi ?? true}
            onCheckedChange={(v) => updateStore("show_wifi", v)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={store.instagram ?? ""}
              onChange={(e) => updateStore("instagram", e.target.value)}
              placeholder="@username"
              className="mt-1.5"
            />
          </div>
          <div className="flex items-end pb-2">
            <div className="flex w-full items-center justify-between">
              <Label htmlFor="show-instagram" className="text-sm">
                Tampilkan di struk
              </Label>
              <Switch
                id="show-instagram"
                checked={store.show_instagram ?? true}
                onCheckedChange={(v) => updateStore("show_instagram", v)}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={store.whatsapp ?? ""}
              onChange={(e) => updateStore("whatsapp", e.target.value)}
              placeholder="08xxxxxxxxxx"
              className="mt-1.5"
            />
          </div>
          <div className="flex items-end pb-2">
            <div className="flex w-full items-center justify-between">
              <Label htmlFor="show-whatsapp" className="text-sm">
                Tampilkan di struk
              </Label>
              <Switch
                id="show-whatsapp"
                checked={store.show_whatsapp ?? false}
                onCheckedChange={(v) => updateStore("show_whatsapp", v)}
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={store.website ?? ""}
            onChange={(e) => updateStore("website", e.target.value)}
            placeholder="https://"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="footer">Pesan Kaki</Label>
          <Input
            id="footer"
            value={store.footer_message ?? ""}
            onChange={(e) => updateStore("footer_message", e.target.value)}
            className="mt-1.5"
          />
        </div>

        <Button
          onClick={handleSaveStore}
          className="h-11 w-full rounded-xl"
          disabled={!storeLoaded || saving}
        >
          <Save className="size-4 mr-2" /> {saving ? "Menyimpan..." : "Simpan Pengaturan Toko"}
        </Button>
      </div>
    </section>
  );
}
