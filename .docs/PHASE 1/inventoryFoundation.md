# Phase 1 — Inventory Foundation

## Tujuan

Menambahkan modul **Inventory Foundation** sebagai dasar untuk sistem perhitungan stok, HPP (Cost of Goods Sold), analisis profit, dan laporan keuangan pada fase berikutnya.

> **Catatan**
>
> Phase ini **tidak mengubah alur POS yang sudah ada**.
>
> Modul Inventory hanya menambahkan data baru yang nantinya akan digunakan oleh Cost Engine pada Phase 2.

---

# Objectives

- Menambahkan master data bahan baku.
- Menambahkan master satuan.
- Menambahkan supplier.
- Menambahkan proses pembelian bahan baku.
- Menambahkan Bill of Materials (Recipe/BOM).
- Menambahkan histori seluruh pergerakan stok.
- Menyiapkan struktur database agar dapat menghitung HPP dan Profit pada fase berikutnya.

---

# Database Changes

## New Tables

### 1. units

Digunakan sebagai master satuan seluruh bahan baku.

| Column | Type | Constraint |
|---------|------|-----------|
| id | uuid PK | |
| name | text | unique |
| symbol | text | unique |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Contoh data:

| name | symbol |
|------|---------|
| Gram | g |
| Kilogram | kg |
| Milliliter | ml |
| Liter | l |
| Pieces | pcs |

---

### 2. ingredients

Master seluruh bahan baku.

> Bukan produk yang dijual.

| Column | Type | Constraint |
|---------|------|-----------|
| id | uuid PK | |
| unit_id | uuid FK → units |
| name | text | unique |
| sku | text | nullable |
| current_stock | numeric(18,3) | default 0 |
| minimum_stock | numeric(18,3) | default 0 |
| average_cost | numeric(18,2) | default 0 |
| is_active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

---

### 3. ingredient_categories

Master kategori bahan baku.

Digunakan untuk mengelompokkan ingredient agar lebih mudah dikelola, difilter, dan dianalisis.

| Column | Type | Constraint |
|---------|------|-----------|
| id | uuid PK | |
| name | text | unique |
| description | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Contoh data:

| Name |
|------|
| Daging |
| Sayuran |
| Bumbu |
| Minuman |
| Kemasan |
| Frozen Food |
| Bahan Pelengkap |

---

### Update Table: ingredients

Tambahkan relasi kategori pada tabel `ingredients`.

| Column | Type | Constraint |
|---------|------|-----------|
| category_id | uuid FK → ingredient_categories |

Sehingga struktur tabel menjadi:

| Column | Type | Constraint |
|---------|------|-----------|
| id | uuid PK | |
| category_id | uuid FK → ingredient_categories |
| unit_id | uuid FK → units |
| name | text | unique |
| sku | text | nullable |
| current_stock | numeric(18,3) | default 0 |
| minimum_stock | numeric(18,3) | default 0 |
| average_cost | numeric(18,2) | default 0 |
| is_active | boolean | default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

### 8. ingredient_batches

Menyimpan histori setiap batch pembelian ingredient.

> **Catatan**
>
> Phase 1 belum menggunakan tabel ini untuk perhitungan HPP.
>
> Tabel ini disiapkan sebagai fondasi untuk implementasi FIFO, FEFO, expired management, dan inventory valuation pada fase berikutnya.

| Column | Type | Constraint |
|---------|------|-----------|
| id | uuid PK | |
| ingredient_id | uuid FK → ingredients |
| purchase_order_item_id | uuid FK → purchase_order_items |
| quantity_received | numeric(18,3) | |
| quantity_remaining | numeric(18,3) | |
| cost_per_unit | numeric(18,2) | |
| expired_at | date | nullable |
| manufactured_at | date | nullable |
| batch_number | text | nullable |
| created_at | timestamptz | |

Contoh:

| Ingredient | Qty | Cost | Expired |
|------------|-----|------|----------|
| Ayam | 20 Kg | Rp45.000 | 2026-08-20 |
| Ayam | 15 Kg | Rp48.000 | 2026-08-25 |
| Kol | 30 Kg | Rp6.000 | 2026-07-30 |

Setiap pembelian akan menghasilkan minimal satu record pada tabel ini.

---

## Updated Database Relationships

```text
ingredient_categories
        │
        │
        ▼
ingredients
    │
    ├──────────────┐
    │              │
    │              │
    │         ingredient_batches
    │              │
    │              │
    │      purchase_order_items
    │              │
    │              ▼
stock_movements  purchase_orders
    │              │
    │              ▼
    │         suppliers
    │
    ▼
units


products
    │
    │
    ▼
product_recipes
    ▲
    │
ingredients
```

---

## Rules

### Ingredient Category

- Nama kategori harus unik.
- Kategori tidak dapat dihapus apabila masih memiliki ingredient.
- Ingredient harus memiliki tepat satu kategori.

---

### Ingredient Batch

- Batch hanya dibuat ketika Purchase Order berstatus `completed`.
- Quantity Remaining tidak boleh melebihi Quantity Received.
- Quantity Remaining tidak boleh bernilai negatif.
- Batch tidak boleh diubah setelah stoknya telah digunakan.
- Batch boleh memiliki tanggal kedaluwarsa (`expired_at`) atau bernilai NULL apabila tidak berlaku.

---

## Future Usage

Walaupun belum digunakan pada Phase 1, tabel `ingredient_batches` akan digunakan pada fase berikutnya untuk:

- FIFO Costing
- FEFO (First Expired First Out)
- Expired Stock Management
- Batch Recall
- Inventory Valuation
- Audit Pembelian
- Warehouse Management

### 3. suppliers

Master supplier.

| Column | Type |
|---------|------|
| id | uuid PK |
| name | text |
| phone | text |
| email | text |
| address | text |
| notes | text |
| created_at | timestamptz |
| updated_at | timestamptz |

---

### 4. purchase_orders

Header pembelian bahan.

| Column | Type |
|---------|------|
| id | uuid PK |
| supplier_id | uuid FK → suppliers |
| invoice_number | text |
| purchase_date | timestamptz |
| total_amount | numeric(18,2) |
| status | purchase_status |
| notes | text |
| created_by | uuid |
| created_at | timestamptz |
| updated_at | timestamptz |

Status:

- draft
- completed
- cancelled

---

### 5. purchase_order_items

Detail pembelian.

| Column | Type |
|---------|------|
| id | uuid PK |
| purchase_order_id | uuid FK |
| ingredient_id | uuid FK |
| quantity | numeric(18,3) |
| unit_cost | numeric(18,2) |
| subtotal | numeric(18,2) |

---

### 6. product_recipes

Bill of Materials (Recipe).

Menghubungkan produk dengan bahan baku.

| Column | Type |
|---------|------|
| id | uuid PK |
| product_id | uuid FK → products |
| ingredient_id | uuid FK → ingredients |
| quantity | numeric(18,3) |

Contoh

Soto Ayam

- Ayam → 120 gram
- Kol → 40 gram
- Mie → 80 gram

---

### 7. stock_movements

Seluruh histori perubahan stok.

Tidak ada perubahan stok tanpa membuat record pada tabel ini.

| Column | Type |
|---------|------|
| id | uuid PK |
| ingredient_id | uuid FK |
| movement_type | stock_movement_type |
| quantity | numeric(18,3) |
| stock_before | numeric(18,3) |
| stock_after | numeric(18,3) |
| reference_type | text |
| reference_id | uuid |
| notes | text |
| created_by | uuid |
| created_at | timestamptz |

Movement Type

- purchase
- sale
- adjustment
- waste
- return

---

# New Enums

## purchase_status

```sql
draft
completed
cancelled
```

## stock_movement_type

```sql
purchase
sale
adjustment
waste
return
```

---

# Database Relationships

```text
products
    │
    │ 1
    │
    ▼
product_recipes
    ▲
    │ N
ingredients
    │
    ├──────────────┐
    │              │
    │              │
stock_movements    purchase_order_items
                   │
                   │
             purchase_orders
                   │
                   │
               suppliers

ingredients
      │
      │
      ▼
units
```

---

# Existing Tables

Tidak ada tabel lama yang diubah.

Tetap menggunakan:

- products
- categories
- orders
- order_items
- store_settings

Hal ini menjaga kompatibilitas dengan seluruh modul POS yang sudah berjalan.

---

# Business Flow

## Pembelian Bahan

Supplier

↓

Purchase Order

↓

Purchase Order Items

↓

Tambah current_stock

↓

Catat Stock Movement

---

## Penjualan Produk

Customer membeli produk

↓

POS membuat Order

↓

Recipe dibaca

↓

Setiap ingredient dikurangi sesuai quantity

↓

Catat Stock Movement

---

# Rules

## Inventory

- Stock tidak boleh menjadi negatif.
- Ingredient yang inactive tidak dapat digunakan pada Recipe.
- Ingredient tidak dapat dihapus apabila sudah pernah digunakan.
- Semua perubahan stok wajib menghasilkan Stock Movement.

---

## Recipe

- Satu produk dapat memiliki banyak ingredient.
- Ingredient dapat digunakan oleh banyak produk.
- Quantity recipe harus lebih besar dari nol.

---

## Purchase

- Purchase hanya boleh mengubah stok ketika status berubah menjadi `completed`.
- Purchase yang sudah completed tidak dapat diedit.
- Purchase yang dibatalkan tidak memengaruhi stok.

---

## Performance

- Tambahkan index pada:
    - ingredient_id
    - product_id
    - supplier_id
    - purchase_order_id
    - movement_type
- Seluruh transaksi stok menggunakan database transaction.
- Gunakan row locking (`FOR UPDATE`) ketika melakukan update stok.
- Hindari race condition saat dua kasir melakukan transaksi bersamaan.

---

# Deliverables

Setelah Phase 1 selesai sistem memiliki:

- ✅ Master Ingredient
- ✅ Master Unit
- ✅ Master Supplier
- ✅ Purchase Order
- ✅ Purchase Detail
- ✅ Product Recipe (BOM)
- ✅ Stock Movement
- ✅ Relasi database untuk Cost Engine

Phase ini **belum menghitung HPP maupun Profit**.

Namun seluruh data yang dibutuhkan sudah tersedia sehingga Phase 2 (Cost Engine & HPP) dapat dibangun tanpa melakukan perubahan struktur database lagi.