# Project Structure
Dokumen ini menjelaskan arsitektur terbaru yang digunakan pada project **Sinar Sentosa POS System**.

Arsitektur menggunakan pendekatan **Hybrid Feature-Based Architecture**, yaitu kombinasi antara:

- **Shared Layer** → seluruh kode yang dapat digunakan lintas fitur.
- **Feature Layer** → seluruh business logic dikelompokkan berdasarkan domain.
- **Route Layer** → hanya sebagai entry point aplikasi.
- **Integration Layer** → komunikasi dengan service eksternal.
- **Lib Layer** → konfigurasi global aplikasi.

Pendekatan ini dipilih agar project tetap mudah dikembangkan ketika fitur bertambah seperti Inventory, Cost Engine, Financial Report, Business Intelligence, Multi Branch, dan lainnya.

---

# Architecture Overview

```
Presentation Layer
        │
        ▼
Routes (Entry Point)
        │
        ▼
Feature Pages
        │
        ▼
Feature Components
        │
        ▼
Feature Hooks
        │
        ▼
Feature Services
        │
        ▼
Integrations
        │
        ▼
Supabase / Capacitor / Printer / External API
```

---

# Directory Tree

```text
FrontEnd/
├── public/
│   └── [favicon, images, manifest, etc]
│
├── src/
│
│   ├── app/
│   │   ├── providers/
│   │   ├── router.tsx
│   │   ├── query-client.ts
│   │   └── app.tsx
│   │
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── schemas/
│   │   ├── types/
│   │   ├── providers/
│   │   ├── layouts/
│   │   └── icons/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── cashier/
│   │   ├── orders/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── inventory/
│   │   ├── ingredients/
│   │   ├── suppliers/
│   │   ├── purchases/
│   │   ├── recipes/
│   │   ├── printer/
│   │   ├── settings/
│   │   └── [future features]
│   │
│   ├── routes/
│   │   ├── auth/
│   │   ├── owner/
│   │   ├── cashier/
│   │   ├── settings/
│   │   └── index.tsx
│   │
│   ├── integrations/
│   │   ├── supabase/
│   │   ├── printer/
│   │   ├── capacitor/
│   │   ├── bluetooth/
│   │   └── storage/
│   │
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   └── query-client.ts
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   ├── theme.css
│   │   └── tailwind.css
│   │
│   └── types/
│       ├── api.ts
│       ├── pagination.ts
│       └── user.ts
│
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

# Folder Responsibilities

---

## `/public`

### Purpose

Menyimpan static assets yang tidak diproses oleh bundler.

Contoh:

- favicon
- manifest
- robots.txt
- static images

---

## `/src/app`

### Purpose

Bootstrap aplikasi.

Berisi seluruh konfigurasi global aplikasi.

Contoh:

- React Query Provider
- Router Provider
- Theme Provider
- Authentication Provider
- Global Error Boundary

---

## `/src/assets`

### Purpose

Asset yang akan diproses oleh Vite.

Contoh:

- Images
- SVG
- Icons
- Fonts

Digunakan melalui import.

---

# Shared Layer

Folder ini berisi seluruh kode yang dapat digunakan oleh seluruh feature.

Business Logic tidak boleh berada di dalam folder ini.

---

## `/shared/components`

### Purpose

Reusable UI Components.

Contoh:

```
Button

LoadingButton

DataTable

ConfirmDialog

EmptyState

SearchInput

CurrencyInput

DatePicker

Skeleton

Card

Badge

Pagination
```

---

## `/shared/hooks`

### Purpose

Reusable React Hooks.

Contoh:

```
useDebounce

usePagination

useMediaQuery

useInfiniteScroll

useClipboard

useLocalStorage
```

---

## `/shared/utils`

### Purpose

Pure helper functions.

Contoh:

```
formatCurrency()

formatDate()

downloadFile()

parseError()

generateUUID()
```

---

## `/shared/constants`

### Purpose

Konstanta global.

Contoh:

```
roles.ts

routes.ts

pagination.ts

printer.ts
```

---

## `/shared/schemas`

### Purpose

Validation Schema yang digunakan lintas fitur.

Contoh:

```
pagination.schema.ts

common.schema.ts
```

---

## `/shared/types`

### Purpose

Type global.

Contoh:

```
ApiResponse

Pagination

AuthenticatedUser
```

---

## `/shared/providers`

### Purpose

Reusable React Providers.

Contoh:

```
ThemeProvider

QueryProvider

AuthProvider
```

---

## `/shared/layouts`

### Purpose

Layout aplikasi.

Contoh:

```
AppLayout

OwnerLayout

CashierLayout

AuthLayout
```

---

# Feature Layer

Seluruh Business Logic berada di sini.

Setiap feature berdiri sendiri.

Tidak boleh saling bergantung secara langsung.

---

## Standard Feature Structure

Seluruh feature wajib mengikuti struktur berikut.

```text
feature-name/

components/

hooks/

pages/

services/

queries/

schemas/

types/

utils/

constants/

index.ts
```

---

## Example

```text
products/

components/
hooks/
pages/
services/
queries/
schemas/
types/
utils/
constants/
index.ts
```

---

### components

UI khusus feature.

Contoh:

```
ProductTable

ProductForm

ProductDialog

ProductCard
```

---

### hooks

React Hook khusus feature.

Contoh:

```
useProducts()

useProductForm()

useProductFilter()
```

---

### pages

Halaman utama feature.

Contoh:

```
ProductsPage.tsx
```

---

### services

Business Logic.

Contoh:

```
product.service.ts

productImage.service.ts
```

---

### queries

Seluruh TanStack Query.

Contoh:

```
product.query.ts
```

---

### schemas

Seluruh Zod Schema.

Contoh:

```
product.schema.ts
```

---

### types

Type lokal feature.

---

### utils

Utility khusus feature.

Contoh:

```
calculateDiscount()

mapProduct()
```

---

### constants

Konstanta khusus feature.

---

### index.ts

Public export.

---

# Routes Layer

Folder ini hanya bertugas sebagai Entry Point.

Route tidak boleh memiliki:

- API Call
- Business Logic
- Complex State
- Validation

Contoh:

```tsx
export const Route = createFileRoute(...)({
    component: ProductsPage,
})
```

Seluruh implementasi berada di:

```
features/products/pages/
```

---

# Integrations Layer

Berisi komunikasi dengan layanan eksternal.

Contoh:

```
supabase/

printer/

capacitor/

bluetooth/

storage/
```

---

### Supabase

Berisi:

```
client.ts

server.ts

middleware.ts
```

---

### Printer

Berisi:

```
thermal-printer.ts

escpos.ts

receipt-builder.ts
```

---

# Lib Layer

Berisi konfigurasi global aplikasi.

Contoh:

```
auth.ts

logger.ts

env.ts

query-client.ts
```

Tidak boleh berisi Business Logic.

---

# Global Types

Digunakan apabila tipe digunakan lebih dari satu feature.

Contoh:

```
ApiResponse

Pagination

AuthenticatedUser
```

---

# Dependency Rules

Dependency hanya boleh mengalir ke bawah.

```
Routes
    │
    ▼
Feature Pages
    │
    ▼
Feature Components
    │
    ▼
Feature Hooks
    │
    ▼
Feature Services
    │
    ▼
Integrations
```

---

## Rules

### ✅ Feature boleh menggunakan Shared

```
Feature
    ↓
Shared
```

---

### ❌ Shared tidak boleh menggunakan Feature

```
Shared
    X
Feature
```

---

### ❌ Feature tidak boleh bergantung langsung pada Feature lain

Misalnya:

```
Products
```

tidak boleh mengakses langsung

```
Inventory
```

Apabila membutuhkan fungsi bersama, pindahkan ke:

- shared
- integrations
- lib

---

# Naming Convention

| Type | Convention | Example |
|------|------------|---------|
| React Component | PascalCase | `ProductTable.tsx` |
| React Hook | camelCase + use | `useProducts.ts` |
| Feature Page | PascalCase | `ProductsPage.tsx` |
| Service | camelCase | `product.service.ts` |
| Query | camelCase | `product.query.ts` |
| Schema | camelCase | `product.schema.ts` |
| Utility | camelCase | `formatCurrency.ts` |
| Types | camelCase | `product.ts` |
| Constants | camelCase | `product.constants.ts` |
| Folder | camelCase | `products/` |
| Enum | UPPER_SNAKE_CASE | `ORDER_STATUS` |
| Boolean | Prefix `is`, `has`, `can`, `should` | `isLoading`, `hasPermission` |

---

# Refactoring Goals

Refactoring dilakukan dengan tujuan:

- Menghilangkan file berukuran besar (*God File*).
- Memastikan setiap file memiliki tanggung jawab yang jelas (Single Responsibility Principle).
- Memisahkan UI, Business Logic, Validation, dan Data Access.
- Memudahkan proses testing.
- Mempermudah onboarding developer baru.
- Memastikan struktur project tetap konsisten ketika fitur baru ditambahkan.
- Mendukung pengembangan jangka panjang seperti:
  - Inventory Foundation
  - Cost Engine (HPP)
  - Financial Report
  - Business Intelligence
  - Kitchen Display System
  - Loyalty Program
  - Multi Branch
  - Multi Warehouse

---

# Best Practices

- Maksimal satu file memiliki sekitar **300–400 baris**. Jika melebihi batas tersebut, evaluasi untuk memecahnya menjadi beberapa file berdasarkan tanggung jawabnya.
- Hindari Business Logic di dalam React Component.
- Hindari API Call langsung di dalam UI Component.
- Gunakan Custom Hook untuk state yang kompleks.
- Gunakan Service untuk Business Logic.
- Gunakan Query Layer untuk seluruh TanStack Query.
- Gunakan Shared hanya untuk kode yang benar-benar reusable.
- Seluruh Feature harus independen dan mudah dipindahkan tanpa memengaruhi feature lainnya.
- Selalu ikuti struktur folder standar untuk setiap feature baru agar konsistensi project tetap terjaga.