# Arsitektur & Struktur Workspace POS-SOTO

Dokumen ini memetakan struktur *codebase* proyek POS-SOTO saat ini dan memberikan panduan serta rekomendasi untuk **refactoring** di masa depan. 

Saat ini, banyak file (terutama di dalam `src/routes/` dan `src/lib/`) yang memiliki jumlah baris kode yang sangat panjang karena menggabungkan logika rute, *state management*, *fetching*, dan komponen UI (Form/Dialog) di dalam satu file tunggal.

---

## 1. Top-Level Directory

| Direktori/File | Fungsi Utama |
|---|---|
| `android/` | Proyek native Android (Capacitor) termasuk plugin *Thermal Printer* buatan sendiri. |
| `src/` | *Source code* utama aplikasi React & TanStack Start. |
| `supabase/` | Konfigurasi database, *migrations* (SQL), dan fungsi RPC Postgres. |
| `eslint.config.js` | Konfigurasi *linter* untuk menjaga konsistensi gaya penulisan kode. |

---

## 2. Struktur `src/` Saat Ini

### A. Routing (`src/routes/`)
Proyek ini menggunakan **TanStack Router** dengan sistem *file-based routing*. Semua halaman yang membutuhkan *login* diletakkan di dalam folder `_authenticated/`.

**Contoh Pain Point (Kode Terlalu Panjang):**
- `owner.purchases.tsx` (570+ baris): Berisi tabel *list* pembelian, *form* pembuatan PO, modal detail PO, state logika perhitungan total, hingga integrasi backend.
- `cashier.pos.tsx` (~600 baris): Berisi logika POS, keranjang belanja, perhitungan kembalian, pemanggilan print struk, dll.

### B. Backend / API (`src/lib/`)
Berisi fungsi-fungsi *server-side* menggunakan **TanStack Start Server Functions** (`createServerFn`) dan konfigurasi React Query.

- `pos.functions.ts` & `inventory.functions.ts`: File raksasa yang menampung *semua* fungsi CRUD (Create, Read, Update, Delete) terkait modulnya.
- `inventory.queries.ts` & `queries.ts`: Tempat mendefinisikan *query options* untuk di-consume komponen *frontend*.
- `print/`: Modul khusus untuk menangani interaksi cetak struk via Capacitor Plugin.

### C. Komponen UI (`src/components/`)
Sebagian besar berisi elemen primitif dari **shadcn/ui** di dalam sub-folder `ui/`. Komponen yang lebih spesifik pada aplikasi (seperti `app-shell.tsx`) diletakkan di luarnya.

---

## 3. Rekomendasi Refactoring (Desain Mendatang)

Untuk membuat kode lebih mudah dibaca, dikelola (*maintainability*), dan bebas dari *file* raksasa, disarankan untuk mengadopsi pola **Feature-Sliced Design (FSD)** atau **Modul Berbasis Domain**.

### Konsep Refactoring Halaman (Routes)
Pecah file-file di dalam `src/routes/_authenticated/` agar **hanya bertugas sebagai Entry Point**. 

Contoh untuk `owner.purchases.tsx`:
Alih-alih menaruh seluruh tabel dan form di dalam file route, pindahkan komponen tersebut ke folder `features`:

```
src/
└── features/
    └── purchases/
        ├── components/
        │   ├── purchase-list.tsx      # Menampilkan tabel
        │   ├── purchase-form.tsx      # Form pembuatan PO
        │   └── purchase-detail.tsx    # Modal detail PO
        ├── hooks/
        │   └── use-purchase-cart.ts   # Custom hook untuk state item PO
        └── types.ts                   # Tipe data lokal
```
Lalu di dalam `src/routes/_authenticated/owner.purchases.tsx` cukup mengimpor:
```tsx
import { PurchaseList } from "@/features/purchases/components/purchase-list";
// File route hanya mengatur tab/view aktif, tidak merender elemen HTML kompleks.
```

### Konsep Refactoring Backend (`src/lib/`)
Pecah file `inventory.functions.ts` yang sudah terlalu besar menjadi beberapa file spesifik berdasarkan *entity* (tabel).

```
src/
└── server/ (atau src/lib/api/)
    ├── ingredients.ts     # getIngredients, saveIngredient
    ├── suppliers.ts       # getSuppliers, saveSupplier
    ├── purchases.ts       # savePurchaseOrder, completePurchaseOrder
    └── stock.ts           # adjustStock, getStockMovements
```

### Tips Implementasi Refactoring
1. **Ekstrak Custom Hooks:** Jika Anda melihat banyak `useState` bertumpuk di komponen (seperti kalkulasi keranjang POS atau kalkulasi total *Purchase Order*), keluarkan ke dalam file `.ts` terpisah, misalnya `use-pos-cart.ts`.
2. **Pisahkan Dialog/Modal:** Modal seperti *Edit Product* atau *Add Recipe* sangat cocok dibuat menjadi komponen terpisah (mis: `product-recipe-dialog.tsx`) yang menerima `isOpen`, `onClose`, dan `productId` sebagai *props*.
3. **Pemisahan Tipe Data (Types):** Jangan menyisipkan *interface* / *type* terlalu banyak di dalam komponen. Gunakan file `types.ts` di tiap *feature module*.

> [!TIP]
> **Kapan harus mulai refactoring?**
> Sangat direkomendasikan untuk melakukan refactoring **setelah** fitur utama (misal Phase 2 selesai) atau **sebelum** menambah fitur baru yang sangat kompleks. Pastikan Anda melakukan commit Git yang bersih sebelum memulai refactoring agar aman jika terjadi masalah (regression).
