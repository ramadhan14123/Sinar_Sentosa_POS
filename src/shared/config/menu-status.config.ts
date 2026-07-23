/**
 * Konfigurasi Status Menu (Fitur Beta / In-Development Badge)
 * 
 * Atur ke `true` jika fitur menu sudah 100% selesai & terverifikasi.
 * Atur ke `false` jika fitur menu masih dalam tahap pengembangan / belum selesai.
 * 
 * Apabila bernilai `false`, badge "Beta" akan otomatis muncul di samping 
 * nama menu pada Sidebar (Desktop & Mobile).
 */
export const MENU_STATUS_CONFIG: Record<string, boolean> = {
  // 
  "Ringkasan": true,
  "Penjualan": true,
  "Produk": true,
  "Persediaan": false,
  "Keuangan": true,
  "Manajemen": true,
  "Pengaturan": true,

  "/cashier": true,            // Antrean
  "/cashier/pos": true,        // Buat Pesanan
  "/cashier/history": true,    // Riwayat Penjualan

  "/owner/products": true,     // Produk
  "/owner/categories": true,   // Kategori

  "/cashier/inventory": false, // Stok (Persediaan)
  "/owner/ingredients": false, // Bahan Baku (Persediaan)
  "/owner/units": false,       // Satuan (Persediaan)
  "/owner/suppliers": false,   // Supplier (Persediaan)
  "/owner/purchases": false,   // Pembelian PO (Persediaan)

  "/owner/expenses": true,     // Pengeluaran
  "/cashier/expenses": true,   // Pengeluaran Toko

  "/owner/staff": true,        // Staf

  "/app/settings/printer": true, // Printer & Toko
  "/app/settings/storage": true, // Storage & Retensi
};

export function isMenuFinished(key: string): boolean {
  if (key in MENU_STATUS_CONFIG) {
    return MENU_STATUS_CONFIG[key] === true;
  }
  return true; // Default: true jika tidak didaftarkan
}
