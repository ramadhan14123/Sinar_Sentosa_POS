# Development Rules

Dokumen ini berisi aturan pengembangan yang **WAJIB** diikuti untuk seluruh fitur pada project **Sinar Sentosa POS System**.

Seluruh implementasi harus mengutamakan:

- Maintainability
- Scalability
- Performance
- Security
- Consistency
- User Experience

---

# 1. Code Quality

## 1.1 Clean Code

Seluruh kode wajib menerapkan prinsip **Clean Code**.

- Gunakan penamaan variabel, fungsi, class, dan file yang jelas.
- Hindari magic number dan hardcoded value.
- Hindari nested code yang berlebihan.
- Gunakan early return bila memungkinkan.
- Hindari duplicate code (DRY).
- Setiap fungsi hanya memiliki satu tanggung jawab (Single Responsibility Principle).

---

## 1.2 Readability

Kode harus mudah dibaca bahkan oleh developer baru.

Pastikan:

- Nama variabel mudah dipahami.
- Nama function menjelaskan tujuan.
- Struktur file konsisten.
- Hindari komentar yang menjelaskan kode yang sudah jelas.
- Gunakan komentar hanya untuk menjelaskan business logic yang kompleks.

---

## 1.3 Reusable

Usahakan kode dapat digunakan kembali.

Contoh:

- Shared Components
- Shared Hooks
- Shared Utility
- Shared Validation
- Shared Types

Jangan melakukan copy-paste logic.

---

## 1.4 Maintainable

Kode harus mudah dikembangkan di masa depan.

Pastikan:

- Modular
- Tidak saling bergantung secara berlebihan
- Mudah dilakukan refactor
- Mudah dilakukan testing

---

# 2. Project Structure

Seluruh fitur baru harus mengikuti struktur project yang sudah ada.

Contoh:

```
components/
hooks/
lib/
routes/
integrations/
```

Jangan mencampurkan:

- UI
- Business Logic
- Database Logic
- Validation

dalam satu file.

---

# 3. Modular Architecture

Pisahkan kode berdasarkan tanggung jawab.

Contoh:

```
Feature

├── Components
├── Hooks
├── Types
├── Validation
├── API
├── Utilities
└── Constants
```

Business Logic tidak boleh berada di dalam UI Component.

---

# 4. Performance

Seluruh fitur harus memperhatikan performa.

Pastikan:

- Query database efisien.
- Hindari N+1 Query.
- Ambil data seperlunya.
- Gunakan pagination apabila data besar.
- Hindari render berulang yang tidak diperlukan.
- Optimalkan re-render React.
- Gunakan lazy loading bila diperlukan.
- Gunakan memoization apabila memberikan manfaat nyata.

---

# 5. Network Optimization

Kurangi data transfer yang tidak diperlukan.

Pastikan:

- Hanya mengambil field yang dibutuhkan.
- Hindari request berulang.
- Gunakan caching apabila memungkinkan.
- Gunakan batching apabila diperlukan.
- Hindari over-fetching.

---

# 6. User Experience

Seluruh proses asynchronous harus memiliki feedback kepada pengguna.

Pastikan:

## Loading

- Button memiliki loading state.
- Table memiliki loading skeleton.
- Form memiliki loading indicator.
- Upload memiliki progress.
- Save memiliki loading state.

User harus mengetahui bahwa sistem sedang bekerja.

---

## Success Feedback

Seluruh operasi penting harus memberikan feedback.

Contoh:

- Berhasil menambah data.
- Berhasil menghapus data.
- Berhasil menyimpan perubahan.
- Berhasil mencetak.

---

## Error Feedback

Seluruh error harus ditampilkan dengan jelas.

Jangan menggunakan pesan seperti:

```
Unknown Error
```

Gunakan pesan yang mudah dipahami pengguna.

Contoh:

```
Stok bahan tidak mencukupi.
```

lebih baik daripada

```
Stock Error
```

---

# 7. Form Validation

Seluruh input harus divalidasi.

Validasi terdiri dari:

- Frontend Validation
- Backend Validation
- Database Constraint

Frontend tidak boleh menjadi satu-satunya validasi.

---

# 8. Database

Perubahan database harus mempertimbangkan:

- Normalisasi
- Relasi
- Index
- Constraint
- Future Scalability

Jangan membuat tabel atau kolom yang hanya memenuhi kebutuhan jangka pendek.

---

# 9. Transaction

Seluruh proses yang mengubah lebih dari satu tabel wajib menggunakan Database Transaction.

Contoh:

- Create Order
- Confirm Payment
- Purchase Ingredient
- Update Stock
- Stock Adjustment

Tidak boleh ada kondisi data setengah berhasil.

---

# 10. Concurrency

Pastikan sistem aman ketika digunakan banyak pengguna.

Gunakan:

- Row Lock
- Atomic Update
- Database Transaction

Hindari race condition.

---

# 11. Security

Seluruh endpoint wajib:

- Authentication
- Authorization
- Input Validation

Jangan mempercayai data dari frontend.

Seluruh pengecekan hak akses dilakukan di backend.

---

# 12. Role Based Access

Seluruh fitur harus memeriksa role user.

Contoh:

Owner

- Dashboard
- Product
- Staff

Cashier

- POS
- Order Queue

Jangan hanya menyembunyikan menu.

Backend tetap wajib memvalidasi role.

---

# 13. Error Handling

Gunakan error yang konsisten.

Contoh:

- Validation Error
- Not Found
- Unauthorized
- Forbidden
- Conflict

Jangan melempar Generic Error.

---

# 14. Logging

Seluruh error penting wajib dicatat.

Contoh:

- Database Error
- Payment Error
- Printer Error
- Authentication Error

Namun jangan menyimpan data sensitif.

---

# 15. Printing

Printer merupakan perangkat eksternal.

Pastikan:

- Connection Timeout
- Retry apabila memungkinkan
- Error Handling
- Feedback kepada pengguna

Jangan menganggap printer selalu tersedia.

---

# 16. Inventory Rules

Seluruh perubahan stok harus:

- Tercatat
- Memiliki histori
- Memiliki referensi transaksi

Tidak boleh ada perubahan stok secara langsung tanpa audit.

---

# 17. UI Consistency

Gunakan komponen UI yang sudah ada.

Hindari membuat Button, Dialog, Input baru apabila komponen yang sama sudah tersedia.

---

# 18. API Design

Seluruh API harus:

- Konsisten
- RESTful
- Mudah dipahami

Response harus konsisten.

Contoh:

```
{
    success,
    data,
    message
}
```

---

# 19. Naming Convention

Gunakan penamaan yang konsisten.

Database

- snake_case

TypeScript

- camelCase

Component

- PascalCase

Enum

- UPPER_SNAKE_CASE

---

# 20. Documentation

Setiap fitur baru wajib memperbarui dokumentasi apabila terdapat perubahan:

- Database
- Flow
- API
- Business Rules
- ER Diagram
- Route
- Permission

Dokumentasi harus selalu sinkron dengan implementasi.

---

# 21. Backward Compatibility

Jangan merusak fitur yang sudah berjalan.

Pastikan:

- Existing API tetap bekerja.
- Existing Database tetap kompatibel.
- Existing Flow tidak berubah tanpa alasan yang jelas.

---

# 22. Scalability

Seluruh implementasi harus mempertimbangkan kemungkinan penambahan fitur di masa depan.

Contoh:

- Multi Branch
- Multi Warehouse
- Loyalty Program
- Inventory Management
- Cost Engine
- Financial Report
- Kitchen Display System

Hindari desain yang mengunci sistem pada kebutuhan saat ini.

---

# 23. Testing Checklist

Sebelum fitur dianggap selesai, pastikan:

- Tidak ada TypeScript Error.
- Tidak ada ESLint Error.
- Tidak ada Build Error.
- Tidak merusak fitur lama.
- Seluruh validasi berjalan.
- Seluruh loading berjalan.
- Seluruh error handling berjalan.
- Seluruh permission berjalan.
- Seluruh transaksi database berjalan dengan benar.

---

# 24. Definition of Done

Sebuah fitur dianggap selesai apabila:

- Requirement telah terpenuhi.
- UI telah selesai.
- Backend telah selesai.
- Database telah selesai.
- Validasi telah selesai.
- Loading telah selesai.
- Error handling telah selesai.
- Permission telah selesai.
- Dokumentasi telah diperbarui.
- Tidak ada bug yang diketahui.

# 25. Business Logic First

Seluruh implementasi harus mengikuti Business Rules terlebih dahulu sebelum implementasi teknis.

Jangan membuat solusi hanya karena lebih mudah diimplementasikan.

Urutan pengembangan harus selalu:

Business Requirement
        ↓
Business Rules
        ↓
Database Design
        ↓
API Design
        ↓
Backend Logic
        ↓
Frontend Implementation
        ↓
UI/UX Enhancement

Implementasi teknis tidak boleh mengubah atau menyederhanakan aturan bisnis tanpa persetujuan.