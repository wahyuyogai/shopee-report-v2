
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Shopee Report (Dashboard & Financial Analytics)

![Next.js](https://img.shields.io/badge/Next.js-16+-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange?style=flat-square&logo=mysql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0+-cyan?style=flat-square&logo=tailwindcss)

Aplikasi dashboard modern berbasis web untuk manajemen operasional e-commerce. Solusi *All-in-One* untuk monitoring **Retur/Gagal Kirim**, analisis **Finance/Income**, dan rekonsiliasi **Saldo (MyBalance)** dengan akurasi tinggi.

</div>

---

## 🚀 Fitur Utama

### 1. 📦 Return Management (Dashboard)
*   **Merger View**: Tampilan cerdas yang menggabungkan data *Pengiriman Gagal* dan *Pengembalian* menjadi satu baris kronologis berdasarkan No. Pesanan.
*   **Status Tracking**: Pelacakan status klaim granular (Pending, Barang Ada, Hilang di Kurir, dll) dengan indikator warna.
*   **Missing SKU Alert**: Notifikasi otomatis jika ada produk yang belum terdaftar di database harga.
*   **Summary Cards**: Statistik real-time untuk Total Pesanan, Breakdown Laporan, Estimasi Kerugian, dan Logistik (Resi).

### 2. 💰 Finance & Financial Analytics
Menu khusus untuk analisis pendapatan dan arus kas:
*   **Order All**: Laporan lengkap seluruh pesanan (Sukses/Gagal/Batal).
*   **Income**: Laporan pendapatan bersih (Escrow released) dengan detail potongan biaya admin/layanan.
*   **MyBalance**: Laporan mutasi saldo dompet penjual (Withdrawal, Adjustment, Penghasilan).

### 3. 📂 Intelligent Upload Manager
Mesin pemrosesan file yang mengenali berbagai format laporan Shopee secara otomatis:
*   **Smart Detection**: Mendeteksi jenis laporan berdasarkan nama file dan struktur kolom.
*   **Sheet Intelligence**: Otomatis mencari sheet yang relevan (`orders`, `Income`, `Transaction Report`).
*   **Advanced Parsing**:
    *   *Standard*: Membaca dari baris pertama.
    *   *Income*: Otomatis skip header (mulai baris 6).
    *   *MyBalance*: Otomatis skip header (mulai baris 18).
*   **Duplicate Protection**: Mencegah input ganda menggunakan *Composite Key* unik untuk setiap jenis laporan.

### 4. 🛠️ Power Tools
*   **SKU Manager**: Database harga pusat. Sistem prioritas pencocokan: `Ref SKU` > `SKU Induk` > `Variasi`.
*   **Bulk Status Update**: Ubah status klaim ratusan pesanan sekaligus via *Copy-Paste* No. Pesanan.
*   **Backup & Restore**: Keamanan data dengan fitur Full Backup (JSON) dan Restore Point.
*   **Customizable UI**: Tema (Light/Dark/Brand), Mode (Glass/Neo), dan pengaturan kolom tabel (Drag & Drop).

---

## ⚙️ Logika & Konvensi File

Agar sistem berjalan optimal, ikuti panduan format file berikut saat melakukan Upload:

### A. Laporan Return & Gagal Kirim
| Jenis | Keyword Filename | Sheet Target | Keterangan |
| :--- | :--- | :--- | :--- |
| **Return** | `...return...xlsx` | Auto | Laporan Pengembalian Shopee |
| **Gagal Kirim** | `...failed_delivery...xlsx` | Auto | Laporan Pengiriman Gagal |
| **Pembatalan** | `...cancellation...xlsx` | Auto | Laporan Pembatalan |

### B. Laporan Finance (Baru)
| Jenis | Contoh Filename Wajib | Sheet Target | Skip Row |
| :--- | :--- | :--- | :--- |
| **Order All** | `...Order.all...xlsx` | `orders` | 0 (Header normal) |
| **Income** | `...Income...xlsx` | `Income` | **5 baris** (Data mulai baris 6) |
| **MyBalance** | `...my_balance...xlsx`<br>`...transaction_report...` | `Transaction Report` | **17 baris** (Data mulai baris 18) |

> **Catatan**: Sistem otomatis mengekstrak **Nama Toko** (awalan nama file) dan **Bulan** (dari kode tanggal YYYYMMDD) untuk metadata.

### D. Normalisasi Data (Penting)

Sistem secara otomatis melakukan normalisasi pada kolom-kolom tertentu untuk menjaga konsistensi data:

*   **Tanggal (Kolom 'Waktu' di Adwords Bill)**: Karena laporan mentah Adwords Bill seringkali memiliki format tanggal yang tidak konsisten (misalnya, `DD/MM/YYYY`, `D/M/YYYY`, atau format angka Excel), sistem akan secara otomatis mengonversi semua variasi ini ke format standar `DD/MM/YYYY` saat proses upload. Hal ini memastikan bahwa pemfilteran, pengurutan, dan kalkulasi data di seluruh aplikasi (termasuk di Dashboard dan Finance) berjalan akurat dan bebas dari error.

### C. SKU Master
Upload file Excel di menu **SKU Manager** dengan header:
`SKU1`, `SKU2`, `Harga`, `ID Produk`.

---

## 💾 Struktur Database (MySQL)

Aplikasi menggunakan `mysql2` dengan skema yang dimigrasi otomatis:

1.  **`reports`**: Penyimpanan utama data laporan.
    *   `id`, `nama_toko`, `jenis_laporan`, `bulan_laporan`, `file_name`, `data` (LONGTEXT/JSON), `created_at`.
2.  **`sku_master`**: Referensi produk & harga.
    *   `id`, `sku1`, `sku2`, `harga`, `id_produk`, `updated_at`.
3.  **`logs`**: Audit trail aktivitas user.
4.  **`column_settings`**: Preferensi tampilan tabel user per tabel ID.

---

## 🔐 Keamanan & Akses

*   **Super Admin**: Akses penuh (Read/Write/Delete/Settings/Upload).
*   **Guest Mode**: Akses *Read-Only*. Aman untuk staf monitoring (Tidak bisa hapus data/upload).
*   **Security Lock**: Fitur penghapusan data massal & restore dilindungi oleh *Countdown Timer* dan validasi.

---

## 💻 Cara Install & Menjalankan

**Prerequisites:** Node.js v18+ & MySQL Server.

1.  **Clone Repository**
    ```bash
    git clone https://github.com/your-repo/shopee-report.git
    cd shopee-report
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment**
    Buat file `.env.local`:
    ```env
    MYSQL_HOST=localhost
    MYSQL_USER=root
    MYSQL_PASSWORD=password
    MYSQL_DATABASE=shopee_report_db

    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=secret
    GUEST_USERNAME=guest
    GUEST_PASSWORD=guest
    ```

4.  **Jalankan Aplikasi**
    ```bash
    npm run dev
    ```
    Akses di `http://localhost:3000`.

---
**Shopee Report** - Built with efficiency, aesthetics, and financial precision in mind.
