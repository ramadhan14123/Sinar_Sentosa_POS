# Sinar Sentosa — Culinary POS System

Sistem Point of Sale untuk **Soto Seger Boyolali** berbasis web hybrid (Capacitor + React), dengan printer thermal, manajemen stok, dan dashboard analitik.

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, TanStack Router, TanStack Query |
| **Backend** | TanStack Start (server functions), Supabase (PostgreSQL + Auth + Storage) |
| **Mobile** | Capacitor 8 (Android) |
| **Printer** | ESC/POS via Bluetooth SPP, USB OTG, Ethernet/WiFi TCP |
| **Deploy** | Vercel (web) + APK (Android native) |

---

## Fitur Lengkap

| # | Fitur | Route | Deskripsi |
|---|-------|-------|-----------|
| 1 | **Login** | `/auth` | Autentikasi email/password via Supabase Auth |
| 2 | **Dashboard Owner** | `/owner` | Analitik bisnis: revenue, transaksi, rata-rata pesanan, barang terjual. Grafik time-series & top produk |
| 3 | **Manajemen Produk** | `/owner/products` | CRUD produk dengan upload gambar (crop 1:1, kompresi WebP) ke Supabase Storage |
| 4 | **Manajemen Kategori** | `/owner/categories` | CRUD kategori dengan urutan tampil (`sort_order`) |
| 5 | **Manajemen Staf** | `/owner/staff` | Buat/hapus akun kasir (via admin API) |
| 6 | **Bahan Baku** | `/owner/ingredients` | Manajemen master bahan baku, riwayat pergerakan stok, dan penyesuaian (opname) |
| 7 | **Satuan & Supplier** | `/owner/units`, `/owner/suppliers` | Data master satuan bahan dan pemasok barang |
| 8 | **Pembelian (PO)** | `/owner/purchases` | Pencatatan transaksi restock dari supplier (Draft, Cancelled, Completed) dengan update HPP & Stok |
| 9 | **Antrean Pesanan** | `/cashier` | Daftar pesanan real-time (polling 5 detik), filter status, cari, aksi per status, input uang diterima, cetak ulang struk |
| 10 | **POS Terminal** | `/cashier/pos` | Buat pesanan baru: katalog produk + keranjang + input nama + uang diterima + kembalian + cetak struk |
| 11 | **Stok Produk** | `/cashier/inventory` | Update stok produk manual |
| 12 | **Cetak Struk Thermal** | — | ESC/POS via Bluetooth/USB/Ethernet. Otomatis setelah bayar. Cetak ulang dari antrean |
| 13 | **Cash Drawer** | — | Buka laci otomatis setelah cetak struk, + uji dari pengaturan |
| 14 | **Pengaturan Printer & Toko** | `/app/settings/printer` | Koneksi printer (Bluetooth/USB/Ethernet), auto-print, uji koneksi/cetak/cash drawer, edit info toko (nama, alamat, WiFi, IG, WA, footer) |

### Navigasi

| Route | Label | Owner Only | Badge |
|-------|-------|------------|-------|
| `/owner` | Ringkasan | ✓ | — |
| `/cashier` | Antrean | — | Jumlah pesanan aktif |
| `/cashier/pos` | Buat Pesanan | — | — |
| `/cashier/inventory` | Stok | — | — |
| `/owner/products` | Produk | ✓ | — |
| `/owner/categories` | Kategori | ✓ | — |
| `/owner/ingredients` | Bahan Baku | ✓ | — |
| `/owner/units` | Satuan | ✓ | — |
| `/owner/suppliers` | Supplier | ✓ | — |
| `/owner/purchases` | Pembelian (PO) | ✓ | — |
| `/owner/staff` | Staf | ✓ | — |
| `/app/settings/printer` | Printer | — | — |

---

## Relasi Database

### Enums

```sql
CREATE TYPE public.app_role AS ENUM ('owner', 'cashier');
CREATE TYPE public.order_status AS ENUM ('pending_payment', 'confirmed', 'processing', 'completed', 'cancelled');
CREATE TYPE public.purchase_status AS ENUM ('draft', 'completed', 'cancelled');
CREATE TYPE public.stock_movement_type AS ENUM ('purchase', 'sale', 'adjustment', 'waste', 'return');
```

### Entity Relationship

```
profiles (1) ──── (0..1) user_roles
                         │
categories (1) ──── (0..N) products
                           │
                           └── (0..N) order_items ── (N..1) orders
```

### Tabel

#### `profiles`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | uuid PK | Sama dengan `auth.users.id` |
| full_name | text | 2–100 karakter |
| created_at | timestamptz | |
| updated_at | timestamptz | Trigger auto-update |

#### `user_roles`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | uuid PK | |
| user_id | uuid | FK ke auth.users |
| role | app_role | `owner` atau `cashier` |
| created_at | timestamptz | |

**Unique:** `(user_id, role)`

#### `categories`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | uuid PK | |
| name | text UNIQUE | 1–60 karakter |
| sort_order | integer | ≥ 0 |
| created_by | uuid | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `products`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | uuid PK | |
| category_id | uuid FK → categories | ON DELETE RESTRICT |
| name | text | 1–100 karakter |
| description | text | maks 500 |
| price_idr | integer | > 0 |
| stock | integer | ≥ 0 |
| image_url | text | nullable, maks 1000 |
| is_active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `orders`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | uuid PK | |
| order_code | text UNIQUE | Format: `ORD-YYMMDD-XXXXXX` |
| tracking_token | uuid | Untuk tracking publik |
| customer_name | text | 2–80 karakter |
| status | order_status | Default `pending_payment` |
| total_idr | integer | > 0 |
| amount_received | integer | Default 0 |
| stock_deducted_at | timestamptz | Nullable, diisi saat konfirmasi bayar |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Unique:** `(order_code, tracking_token)`

#### `order_items`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | uuid PK | |
| order_id | uuid FK → orders | ON DELETE CASCADE |
| product_id | uuid FK → products | ON DELETE SET NULL |
| product_name_snapshot | text | Nama produk saat order dibuat |
| price_snapshot | integer | Harga saat order dibuat |
| quantity | integer | 1–99 |
| subtotal | integer | > 0 |
| created_at | timestamptz | |

#### `store_settings`
| Kolom | Tipe | Default |
|-------|------|---------|
| id | uuid PK | |
| business_name | text | `'Sinar Sentosa'` |
| business_address | text | `''` |
| business_phone | text | `''` |
| wifi_ssid | text | `''` |
| wifi_password | text | `''` |
| instagram | text | `''` |
| whatsapp | text | `''` |
| website | text | `''` |
| footer_message | text | `'Terima kasih atas kunjungan Anda'` |
| show_wifi | boolean | `true` |
| show_instagram | boolean | `true` |
| show_whatsapp | boolean | `false` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### New Inventory Tables (Phase 1)
- `units`: Satuan ukur (kg, g, L).
- `ingredient_categories`: Kategori bahan.
- `ingredients`: Master data bahan baku (Stok, HPP, SKU, dll).
- `suppliers`: Data pemasok.
- `purchase_orders`: Transaksi pembelian bahan.
- `purchase_order_items`: Detail item pembelian.
- `product_recipes`: Relasi many-to-many Produk ↔ Bahan (Resep/BOM).
- `stock_movements`: Log mutasi stok harian (In/Out/Adjust).
- `ingredient_batches`: Tracking batch HPP FIFO (disiapkan untuk Phase 2).

### Indexes

```sql
products_category_idx ON products(category_id)
products_active_idx   ON products(is_active)
orders_status_created_idx ON orders(status, created_at DESC)
order_items_order_idx     ON order_items(order_id)
idx_ingredients_category ON ingredients(category_id)
idx_purchase_orders_supplier ON purchase_orders(supplier_id)
idx_stock_movements_ingredient ON stock_movements(ingredient_id)
```

### Realtime Publication

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
```

### Storage (product-images bucket)

| Operasi | Policy |
|---------|--------|
| SELECT | Semua bisa baca |
| INSERT | Owner saja |
| UPDATE | Owner saja |
| DELETE | Owner saja |

---

## RPC Functions (Stored Procedures)

### `create_order(p_customer_name text, p_items jsonb) → jsonb`
Membuat pesanan baru. Validasi stok. Generate `order_code`. Simpan snapshot nama & harga produk.

**Returns:** `{ order_code, tracking_token, order_id }`

### `confirm_order_payment(p_order_id uuid, p_amount_received integer DEFAULT 0)`
Konfirmasi pembayaran. Validasi staff role. Lock row (`FOR UPDATE`). Cek stok mencukupi. Kurangi stok. Set status `confirmed`, isi `stock_deducted_at` & `amount_received`.

### `update_order_status(p_order_id uuid, p_new_status order_status)`
Ubah status pesanan dengan validasi transisi:
- `confirmed → processing`
- `processing → completed`
- `pending_payment → cancelled`

### `get_order_by_code(p_order_code text, p_tracking_token uuid) → jsonb`
Ambil detail pesanan untuk tracking publik.

### `has_role(_user_id uuid, _role app_role) → boolean`
Cek apakah user punya role tertentu.

### `is_staff(_user_id uuid) → boolean`
Cek apakah user adalah owner ATAU cashier.

### `get_store_settings() → jsonb`
Ambil pengaturan toko terbaru. Jika kosong, kembalikan default.

### `upsert_store_settings(p_settings jsonb)`
Simpan/perbarui pengaturan toko. Hanya owner.

### `set_updated_at() → trigger`
Trigger function untuk auto-update `updated_at`.

---

## Arsitektur Cetak (Print Flow)

```
printReceipt(rawOrder, store, cashierName)
  │
  ├─ mapOrder() → OrderReceipt
  ├─ loadPrinterConfig() → PrinterConfig (localStorage)
  │
  ├─ [Thermal path] autoPrint=true + printer address exists
  │   ├─ buildReceiptData() → ReceiptData
  │   ├─ EscPosEncoder → build ESC/POS bytes
  │   ├─ sendEscPosData() → plugin.sendData() → native write
  │   ├─ openCashDrawer() → plugin.sendData({0x1B,0x70,0x00,0x32,0xFF})
  │   └─ return "thermal"
  │
  └─ [Fallback] return "pdf"
```

### Komponen Print

| File | Fungsi |
|------|--------|
| `thermal-printer.ts` | Wrapper: connect, disconnect, scan, send data, test print, cash drawer |
| `capacitor-plugin.ts` | Interface plugin + mock untuk web |
| `esc-pos-encoder.ts` | Builder bytecode ESC/POS |
| `receipt-builder.ts` | Transform order data → receipt format |
| `print-manager.ts` | Orchestrator: pilih thermal atau PDF |
| `printer-store.ts` | Simpan konfigurasi printer di localStorage |
| `types.ts` | Type definitions (PrinterConfig, ReceiptData, StoreSettings) |
| `ThermalPrinterPlugin.java` | Native Android plugin (Bluetooth SPP, TCP socket, USB) |

### Perintah ESC/POS untuk Cash Drawer

```
Byte:  0x1B  0x70  0x00  0x32  0xFF
Makna: ESC   p     pin2  on(50ms) off(255ms)
```

---

## Autentikasi & Otorisasi

### Flow
1. Login → Supabase Auth → session token
2. Setiap request server function menyertakan `Authorization: Bearer <token>`
3. Middleware `requireSupabaseAuth` validasi token, inject `userId` + `supabase` ke context
4. Server function / RPC cek role via `has_role()` atau `is_staff()`

### Role-Based Access

| Fitur | Owner | Cashier |
|-------|-------|---------|
| Dashboard analitik | ✓ | — |
| Manajemen produk | ✓ | — |
| Manajemen kategori | ✓ | — |
| Manajemen staf | ✓ | — |
| Antrean pesanan | ✓ | ✓ |
| POS Terminal | ✓ | ✓ |
| Update stok | ✓ | ✓ |
| Pengaturan printer & toko | ✓ | ✓ |

---

## System Requirements

### Android (Native APK)
| Requirement | Minimum |
|-------------|---------|
| **OS** | Android 8.0 (API 24) |
| **RAM** | 2 GB |
| **Bluetooth** | Untuk printer thermal Bluetooth SPP |
| **USB OTG** | Untuk printer thermal via USB |
| **WiFi** | Untuk printer thermal WiFi/Ethernet |
| **Storage** | 100 MB |

### Web (Vercel)
| Requirement | Minimum |
|-------------|---------|
| **Browser** | Chrome 90+, Firefox 90+, Edge 90+, Safari 15+ |
| **Internet** | Stabil (Polling 5 detik, real-time) |

### Dependencies (Production)

| Package | Versi |
|---------|-------|
| react | ^19.2.0 |
| react-dom | ^19.2.0 |
| @tanstack/react-query | ^5.83.0 |
| @tanstack/react-router | ^1.168.25 |
| @tanstack/react-start | ^1.167.50 |
| @supabase/supabase-js | ^2.108.1 |
| tailwindcss | ^4.2.1 |
| lucide-react | ^0.575.0 |
| recharts | ^2.15.4 |
| sonner | ^2.0.7 |
| motion | ^12.40.0 |
| react-easy-crop | ^6.0.2 |
| browser-image-compression | ^2.0.2 |
| pdf-lib | ^1.17.1 |
| zod | ^3.24.2 |
| @capacitor/core | ^8.4.1 |
| @capacitor/android | ^8.4.1 |
| date-fns | ^4.1.0 |
| react-hook-form | ^7.71.2 |

### Database (Supabase)
| Service | Catatan |
|---------|---------|
| **PostgreSQL** | 1 instance |
| **Auth** | Email/password, admin API |
| **Storage** | Bucket `product-images` untuk gambar produk |
| **Realtime** | `orders` & `products` publikasi untuk live update |

### Hosting
| Platform | Untuk |
|----------|-------|
| **Vercel** | Web app (server functions, SSR) |
| **Supabase** | Database, Auth, Storage |
| **APK** | Android native (Capacitor) |

---

## Struktur Project

```
src/
├── components/       # UI components (AppShell, OrderQueue, etc.)
│   └── ui/           # shadcn/ui primitives (button, input, sheet, etc.)
├── hooks/            # Custom hooks (useRole, useActionGuard)
├── integrations/     # Supabase client, auth middleware
├── lib/
│   ├── print/        # Printer: plugin, encoder, builder, manager
│   ├── pos.functions.ts   # Server functions (order, product, category, staff)
│   ├── settings.functions.ts
│   ├── queries.ts    # TanStack Query configs
│   └── format.ts     # Format IDR, datetime
├── routes/           # TanStack Router file-based routing
│   ├── _authenticated/    # Protected routes
│   │   ├── cashier.pos.tsx    # POS terminal
│   │   ├── cashier.index.tsx  # Order queue
│   │   ├── cashier.inventory.tsx
│   │   ├── owner.index.tsx    # Dashboard
│   │   ├── owner.products.tsx
│   │   ├── owner.categories.tsx
│   │   └── owner.staff.tsx
│   ├── app/
│   │   └── settings.printer.tsx
│   └── auth.tsx
android/
└── app/src/main/java/com/sinarsentosa/pos/
    ├── MainActivity.java
    └── plugins/
        └── ThermalPrinterPlugin.java   # Native printer + cash drawer
```
