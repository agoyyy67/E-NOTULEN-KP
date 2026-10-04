# PRODUCT REQUIREMENT DOCUMENT (PRD)
## e-Notulen: Sistem Manajemen Notulen Rapat Digital Terintegrasi
### Pemerintah Kabupaten Purbalingga

---

| Informasi Dokumen | Detail |
| :--- | :--- |
| **Nama Produk** | **e-Notulen Pemkab Purbalingga** |
| **Versi Dokumen** | **2.2 (Final - Termasuk Seluruh Fitur & Revisi)** |
| **Status** | Production Ready / Active Development |
| **Pemilik Produk** | Pemerintah Kabupaten Purbalingga |
| **Target Pengguna** | Seluruh Organisasi Perangkat Daerah (OPD/SKPD), Pejabat Struktural, Notulis Rapat, Peserta Rapat Dinas |
| **Klasifikasi Sistem** | Full-stack Web Application (Enterprise E-Governance) |
| **Tanggal Pembaruan** | Maret 2026 |

---

## 1. Executive Summary & Problem Statement

### 1.1 Latar Belakang
Setiap Organisasi Perangkat Daerah (OPD) di lingkungan Pemerintah Kabupaten Purbalingga secara rutin menyelenggarakan rapat kedinasan—mulai dari rapat koordinasi internal, rapat lintas instansi, musrenbang, hingga rapat pimpinan daerah. Selama ini, tata kelola notulensi masih mengandalkan cara manual (kertas fisik dan dokumen file lepas pada perangkat pribadi masing-masing pegawai), yang memicu sejumlah kendala:
1. **Risiko Kehilangan Dokumen:** Berkas fisik rentan rusak atau hilang seiring mutasi pegawai.
2. **Standardisasi Format Terfragmentasi:** Format penulisan, kop surat kedinasan, struktur daftar hadir, dan blok legalisasi tanda tangan berbeda-beda antar-OPD.
3. **Sulitnya Temu Kembali Informasi:** Pencarian arsip keputusan atau tindak lanjut rapat masa lampau memerlukan waktu berjam-jam membuka tumpukan berkas.
4. **Proses Absensi Konvensional yang Tidak Efisien:** Pengisian daftar hadir manual berbasis kertas sering menimbulkan antrean dan data tidak terpusat secara digital.

### 1.2 Visi & Tujuan Produk
**e-Notulen** dibangun sebagai platform digital terpusat (single source of truth) untuk administrasi notulensi rapat seluruh OPD Pemkab Purbalingga dengan tujuan:
- **Digitalisasi End-to-End:** Menggantikan proses manual sejak pra-rapat (metadata), saat rapat (pengetikan notulen interaktif & absensi QR Code), hingga pasca-rapat (legalisasi, pengarsipan, dan distribusi dokumen).
- **Standardisasi Identitas Kedinasan:** Menyeragamkan format kop surat dinas, penomoran, daftar hadir, dan blok tanda tangan sesuai tata naskah dinas resmi Pemkab Purbalingga.
- **Efisiensi & Aksesibilitas:** Memfasilitasi pencarian arsip berbasis full-text search, visualisasi kinerja rapat via dashboard analitik, serta ekspor dokumen multi-format (PDF resmi siap cetak dan Microsoft Word `.docx` yang dapat disunting).
- **Single Sign-On (SSO):** Terintegrasi langsung dengan ekosistem autentikasi daerah (Keycloak realm `apps`) dan data referensi SKPD e-Kinerja tanpa redundansi database pengguna.

---

## 2. Pengguna Sistem & Role-Based Access Control (RBAC)

Sistem menggunakan kontrol akses berbasis peran (RBAC) ketat dengan pemisahan scope kerja antar-OPD. Identitas dan role diekstraksi langsung dari klaim JWT Keycloak (`resource_access["e-notulen"].roles`).

```
                              ┌─────────────────────────────────────────┐
                              │     Keycloak SSO (Realm: apps)          │
                              └────────────────────┬────────────────────┘
                                                   │ JWT Token
                    ┌──────────────────────────────┼──────────────────────────────┐
                    ▼                              ▼                              ▼
        ┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
        │      Super Admin      │      │    Operator (OPD)     │      │   Officer (Pegawai)   │
        └───────────┬───────────┘      └───────────┬───────────┘      └───────────┬───────────┘
                    │                              │                              │
     Scope: Seluruh OPD Kabupaten      Scope: 1 OPD Terdaftar         Scope: Notulen Pribadi
     - Kelola semua notulen            - Kelola notulen OPD           - Buat & edit notulen sendiri
     - Atur kop surat semua OPD        - Atur kop surat OPD sendiri   - Ekspor PDF & Word sendiri
     - Analitik & rekap kabupaten      - Rekap laporan OPD            - Read-only profil & kop OPD
```

### 2.1 Matriks Wewenang & Hak Akses

| Fitur / Modul | Super Admin (`admin`) | Operator OPD (`operator`) | Officer (`officer`) | Publik / Peserta Rapat |
| :--- | :---: | :---: | :---: | :---: |
| **Login via SSO e-Akun Purbalingga** | ✅ | ✅ | ✅ | ❌ |
| **Lihat Dashboard Statistik** | Global (Semua OPD) | Scope OPD Sendiri | Scope Pribadi | ❌ |
| **Buat Notulen Baru** | ✅ (Bisa pilih OPD) | ✅ (OPD Otomatis) | ✅ (OPD Otomatis) | ❌ |
| **Edit & Hapus Notulen** | Semua Notulen | Notulen OPD Sendiri | Notulen Milik Sendiri | ❌ |
| **Duplikasi Notulen (Clone)** | ✅ | ✅ | ✅ | ❌ |
| **Restore Notulen (dari Trash)** | ✅ | ✅ | ❌ | ❌ |
| **Ekspor Notulen (PDF Resmi)** | ✅ | ✅ | ✅ | ❌ |
| **Ekspor Notulen (Word DOCX)** | ✅ | ✅ | ✅ | ❌ |
| **Generate QR Code Absensi** | ✅ | ✅ | ✅ | ❌ |
| **Isi Absensi Mandiri (Scan QR)** | ✅ | ✅ | ✅ | ✅ (Tanpa Login) |
| **Kelola Dokumentasi Foto** | ✅ | ✅ | ✅ | ❌ |
| **Lihat & Ekspor Rekap Laporan (CSV)** | Global (Semua OPD) | Scope OPD Sendiri | ❌ | ❌ |
| **Konfigurasi Kop Surat OPD & Logo** | Semua OPD | OPD Sendiri | ❌ (Read-only) | ❌ |
| **Global Command Palette (`Ctrl+K`)** | ✅ | ✅ | ✅ | ❌ |

---

## 3. Arsitektur Sistem & Tech Stack

Sistem dibangun dengan arsitektur monorepo terpisah antara Frontend dan Backend (*decoupled architecture*), mengedepankan efisiensi tinggi, skalabilitas, dan kemudahan deployment.

```
       ┌────────────────────────────────────────────────────────┐
       │                   KLIEN / PENGGUNA                     │
       │     (Desktop Browser, Mobile Tablet, Smartphone)       │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                 FRONTEND (Next.js 16)                  │
       │    App Router, TypeScript, Tailwind CSS, Tiptap Editor  │
       │    Recharts, Lucide Icons, Client API Cache Layer      │
       └──────────────┬───────────────────────────┬─────────────┘
                      │                           │
       (Public Assets / QR Page)          (REST API / Authorization Bearer)
                      │                           │
                      ▼                           ▼
       ┌────────────────────────────────────────────────────────┐
       │                   BACKEND API (Go Chi)                 │
       │   Clean Layered Architecture: Handler -> Service -> Repo│
       │   Keycloak JWT Validator, PDF & Word Engine, Validator │
       └──────────────┬───────────────┬───────────┬─────────────┘
                      │               │           │
                      ▼               ▼           ▼
        ┌──────────────────┐  ┌─────────────┐  ┌────────────────┐
        │  PostgreSQL 16   │  │ MinIO (S3)  │  │ External API   │
        │  Data Notulen,   │  │ Smart Proxy │  │ e-Kinerja SKPD │
        │  Attendees, FTS  │  │ Foto & File │  │ & Keycloak OIDC│
        └──────────────────┘  └─────────────┘  └────────────────┘
```

### 3.1 Rincian Teknologi (Tech Stack)

| Komponen | Teknologi | Keterangan & Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router)** | Framework React modern dengan Server Components & Client Hydration optimal. |
| **Language (Frontend)** | **TypeScript 5.x** | *Strict type-safety*, meminimalisasi runtime error pada payload dokumen rapat. |
| **Styling & UI** | **Tailwind CSS + Lucide Icons** | Sistem desain responsif, modern, *fresh & clean*, ramah bagi aparatur sipil negara. |
| **Rich Text Editor** | **Tiptap (@tiptap/react)** | Headless editor berbasis ProseMirror dengan ekstensi heading, list, tabel, & history. |
| **Chart & Visualisasi**| **Recharts** | Visualisasi tren rapat dan peringkat aktivitas OPD. |
| **Backend Framework** | **Go (Golang 1.22+)** | Performa konkurensi tinggi, konsumsi memori minimal, kompilasi binary tunggal. |
| **HTTP Router** | **Chi Router (v5)** | Router lightweight idiomatik Go, performa tinggi dengan dukungan middleware modular. |
| **Database Driver** | **pgx/v5 (Connection Pool)** | Driver PostgreSQL native Go berkecepatan tinggi dengan pooling terkelola. |
| **Database Engine** | **PostgreSQL 16** | Database relasional dengan JSONB support dan GIN Index Full-Text Search. |
| **Object Storage** | **MinIO (S3-Compatible)** | Penyimpanan foto dokumentasi dan berkas PDF fisik terdistribusi. |
| **Dokumentasi Engine** | **gofpdf (PDF) & baliance/gooxml (Word)** | Engine native Go untuk generate PDF dinas dan Word `.docx` presisi. |
| **Autentikasi SSO** | **Keycloak OIDC (Realm: `apps`)** | Layanan Single Sign-On resmi Pemkab Purbalingga. |
| **Data Master SKPD** | **REST API e-Kinerja Purbalingga** | Sinkronisasi data unit kerja pemerintah secara realtime dengan caching 1 jam. |
| **Containerization** | **Docker & Docker Compose** | Konfigurasi *multi-stage build* untuk container production yang ramping dan aman. |

---

## 4. Rincian Fitur Komprehensif (Termasuk Seluruh Revisian)

### 4.1 Modul Autentikasi & Integrasi Keycloak SSO
- **Single Sign-On (SSO):** Autentikasi terpusat melalui Keycloak Pemkab Purbalingga (`accounts.purbalinggakab.go.id`). Pengguna tidak perlu menghafal kata sandi terpisah.
- **Auto Token Refreshing:** Frontend dan middleware secara cerdas memperbarui access token di latar belakang sebelum kedaluwarsa tanpa menginterupsi pengguna yang sedang menulis notulen.
- **Session Protection:** Proteksi route App Router (`(main)/*`), otomatis mengarahkan ke halaman login resmi jika sesi kedaluwarsa.
- **Zero Local Users Table:** Sistem tidak menduplikasi data kredensial atau profil pengguna di PostgreSQL. Semua informasi (Nama, NIP, Jabatan, Kode Unit) diekstraksi dinamis dari klaim JWT token.

### 4.2 Modul Pembuatan & Penyuntingan Notulen (Core Notulen)
- **Dua Pilihan Tipe Input Notulen (`input_type`):**
  1. *Tulis Langsung (Editor):* Menggunakan rich text editor untuk penulisan rapat terstruktur lengkap dengan kop surat dinas.
  2. *Upload Dokumen Fisik:* Pengunggahan berkas notulen fisik yang sudah dipindai (format PDF/DOCX) untuk rapat yang telah dibuat di luar sistem.
- **Document Canvas Layout (WYSIWYG):** Antarmuka penulisan diatur menyerupai lembar kertas dinas asli (font Times New Roman, kop surat resmi, garis ganda pembatas) sehingga apa yang diketik sama persis dengan hasil cetak.
- **Metadata Rapat Lengkap:**
  - Judul Rapat (Topik pembahasan kedinasan).
  - Hari & Tanggal Pelaksanaan (dengan kalender pemilih tanggal).
  - Waktu Mulai & Waktu Selesai (dengan opsi "Selesai").
  - Tempat / Ruang Rapat (dengan pemotongan responsif pada header).
  - OPD / Instansi Pelaksana (otomatis terisi dari token atau dipilih oleh Super Admin).
- **Pemisahan Pemimpin Rapat vs Pimpinan Penanda Tangan *(Revisi Signifikan)*:**
  - *Pemimpin Rapat (`led_by`, `led_by_position`, `led_by_nip`):* Pejabat yang memimpin jalannya rapat (misal: Kepala Bidang / Sub Koordinator).
  - *Pimpinan Penanda Tangan (`signed_by`, `signed_by_position`, `signed_by_nip`):* Pejabat struktural yang mengesahkan notulen (misal: Kepala Dinas / Sekretaris Daerah). Jika dikosongkan, sistem otomatis menerapkan data Pemimpin Rapat.
- **Data Notulis:** Nama, jabatan, dan NIP notulis yang otomatis terisi dari akun pembuat namun tetap dapat disesuaikan.
- **Real-Time Auto-Save Engine *(Revisi UX)*:**
  - Sistem otomatis melakukan persistensi draf konten setiap 2 detik setelah pengguna berhenti mengetik (*debounced*).
  - Dilengkapi komponen visual **`AutoSaveBadge`** interaktif di header tetap (*sticky header*) dan toolbar Tiptap yang menunjukkan status: *Tersimpan*, *Menyimpan...*, atau *Gagal*.
  - Riwayat snapshot tersimpan di tabel `notulen_auto_saves` untuk mencegah kehilangan data akibat kendala daya atau peramban.
- **Tiptap Rich Text Editor:**
  - Dukungan Heading (H1, H2, H3), Bold, Italic, Underline, Strikethrough.
  - Bulleted List, Numbered List, Blockquote, Divider / Horizontal Rule.
  - *Instant Cursor Focus & Click-to-Edit:* Klik di area manapun pada kanvas kertas langsung mengaktifkan kursor pengetikan.
  - Dukungan tabel terstruktur untuk matriks kesepakatan rapat.
- **Pengelolaan Status Notulen:**
  - *Draft:* Notulen masih dalam proses penyusunan/perbaikan internal.
  - *Final:* Notulen telah disahkan, siap didistribusikan dan diunduh.

### 4.3 Modul Presensi & Daftar Hadir (Termasuk QR Code Absensi Mandiri)
- **Manajemen Peserta Internal:** Input nama peserta, instansi/OPD asal, dan jabatan.
- **Combobox Autocomplete Instansi:** Input instansi terhubung dengan daftar resmi seluruh OPD Pemkab Purbalingga untuk mencegah inkonsistensi penulisan nama dinas.
- **Pengurutan Fleksibel (Reorder):** Kemudahan memindahkan posisi peserta ke atas/bawah sesuai hierarki protokoler kedinasan.
- **Fitur QR Code Absensi Mandiri *(Fitur Unggulan Terbaru)*:**
  - Notulis/operator dapat menampilkan modal QR Code interaktif pada layar proyektor atau mencetaknya.
  - Peserta rapat memindai (*scan*) QR Code menggunakan kamera ponsel pintar tanpa perlu memiliki akun atau login ke sistem.
  - Membuka halaman publik presensi (`/absensi/[id]`).
  - Peserta mengisi Nama, memilih Instansi melalui combobox pencarian, dan memasukkan Jabatan.
  - Data kehadiran langsung masuk secara realtime ke dalam tabel daftar hadir notulen terkait.

### 4.4 Modul Dokumentasi & Storage Proxy Terintegrasi *(Revisi Storage)*
- **Multi-Upload Foto Kegiatan:** Unggah foto dokumentasi rapat dalam format JPG, JPEG, atau PNG hingga maksimal 20 foto per notulen.
- **Optimasi & Kompresi Otomatis:** Backend Go secara otomatis mengompresi dan mengubah ukuran foto (*max dimension* 1920px, kualitas 85%) guna menghemat ruang penyimpanan MinIO dan mempercepat loading PDF.
- **Backend Smart Storage Proxy (`/api/v1/storage/*` & `/upload-doc`):**
  - *Penyelesaian Masalah S3 Port & CORS:* Klien tidak lagi diarahkan langsung ke port internal MinIO 9000 yang sering terblokir firewall instansi atau memicu galat CORS.
  - *Direct Proxy Upload:* Pengunggahan dokumen PDF/Word diteruskan secara aman melalui endpoint internal backend.
  - *Fuzzy Path Matching & URL Unescaping:* Menangani nama berkas yang mengandung karakter khusus, spasi, atau variasi bucket secara otomatis.
- **Galeri Dokumentasi:** Tampilan thumbnail dengan dialog lightbox dan tombol hapus instan.

### 4.5 Modul Ekspor & Distribusi Dokumen
- **Ekspor Dokumen PDF Resmi:**
  - Menghasilkan berkas PDF berstandar cetak dinas menggunakan library Go native.
  - Memuat Kop Surat Resmi OPD (Logo Pemkab Purbalingga di kiri, Logo OPD di kanan, nama instansi, alamat lengkap, kontak dinas, garis ganda pemisah).
  - Memuat tabel ringkasan metadata rapat.
  - Sanitasi karakter khusus (`cleanPDFText`) agar simbol unicode/tipografi Tiptap tidak merusak formatting PDF.
  - Tabel Daftar Hadir rapi dengan penomoran otomatis.
  - Blok Legalisasi Tanda Tangan: Posisi seimbang antara Pimpinan Penanda Tangan (kiri/kanan) dan Notulis Rapat lengkap dengan NIP.
  - Halaman Lampiran Dokumentasi: Foto-foto kegiatan disusun otomatis dalam layout grid rapi di halaman belakang PDF.
- **Ekspor Dokumen Microsoft Word (`.docx`) *(Revisi Fitur Terbaru)*:**
  - Fitur ekspor berkas `.docx` melalui endpoint `/api/v1/notulen/{id}/word` yang memungkinkan staf instansi mengedit kembali konten notulen di Microsoft Word offline.
- **Fitur Duplikasi Notulen (Duplicate):**
  - Menggandakan seluruh struktur notulen yang ada (metadata, daftar hadir, kop) menjadi draf notulen baru dengan konfirmasi modal pengaman, sangat menghemat waktu untuk rapat berkala/rutin.
- **Mode Cetak Langsung (Print Ready):**
  - Penggunaan CSS `@media print` khusus yang menyembunyikan navigasi, sidebar, dan tombol aksi, sehingga pengguna dapat langsung mencetak halaman via dialog browser (`Ctrl+P`).

### 4.6 Modul Dashboard & Analitik Kinerja Rapat
- **Ringkasan Indikator Kunci (KPI Cards):**
  - Total Notulen (akumulasi keseluruhan rapat).
  - Rapat Bulan Ini (tren produktivitas bulanan).
  - Jumlah Notulen Final vs Draf (indikator penyelesaian administrasi).
  - Total Peserta Terlayani & Rata-rata Kehadiran per Rapat.
- **Grafik Tren Rapat Bulanan (`MonthlyTrendChart`):** Menampilkan grafik garis/batang frekuensi rapat dalam 12 bulan terakhir.
- **Grafik Peringkat Keaktifan OPD (`OpdRankChart`):** Menampilkan perbandingan produktivitas rapat antar-OPD di lingkungan Pemkab Purbalingga (khusus Super Admin).
- **Daftar Rapat Terbaru & Aksi Cepat:** Akses sekali klik untuk membuat notulen, melanjutkan draf, atau mengunduh berkas rapat terakhir.

### 4.7 Modul Pencarian Cerdas & Global Command Palette
- **Global Command Palette (`Ctrl + K` / `Cmd + K`) *(Revisi UX)*:**
  - Pintasan keyboard global yang dapat diakses dari halaman manapun untuk navigasi super cepat: berpindah ke Dashboard, Daftar Notulen, Buat Notulen Baru, Rekap Laporan, atau Pengaturan Kop Surat.
- **Full-Text Search Terindeks (PostgreSQL GIN):**
  - Pencarian cepat menggunakan kolom `content_search` berbasis `to_tsvector` pada judul dan isi ringkasan rapat.
- **Multi-Parameter Filtering:**
  - Filter dinamis berdasarkan OPD (dropdown API SKPD).
  - Filter rentang tanggal rapat (dari tanggal - sampai tanggal).
  - Filter status (Semua, Draf, Final).
  - Pengurutan berdasarkan tanggal pelaksanaan atau tanggal pembuatan.

### 4.8 Modul Rekap Laporan Kedinasan
- **Laporan Aktivitas Rapat:** Agregasi data rapat berkala untuk bahan evaluasi pimpinan daerah.
- **Filter Fleksibel:** Penyesuaian rentang waktu triwulan, semesteran, atau tahunan per instansi.
- **Ekspor Laporan CSV / Excel:** Mengunduh ringkasan data kegiatan rapat ke format spreadsheet `.csv`.
- **Cetak Laporan Resmi:** Layout cetak laporan siap tanda tangan kepala dinas/sekretaris daerah.

### 4.9 Modul Pengaturan Kop Surat OPD & Profil
- **Konfigurasi Identitas Kop Surat Kedinasan (`opd_settings`):**
  - Pengaturan Alamat Kantor, Nomor Telepon, Faksimili, dan Email Resmi OPD.
  - Pengunggahan Logo Resmi OPD ke penyimpanan MinIO.
  - *Live Preview:* Pratinjau langsung tampilan kop surat sebelum diterapkan pada dokumen PDF resmi.
  - Super Admin memiliki hak akses untuk menyesuaikan pengaturan kop surat seluruh OPD.
- **Halaman Profil Pengguna:**
  - Menampilkan ringkasan identitas pegawai: Nama Lengkap, NIP, Jabatan, Unit Kerja, dan Role Badge.
  - Tautan langsung ke Keycloak Account Management untuk perubahan data kredensial akun.

---

## 5. Skema & Model Basis Data (PostgreSQL)

Database menggunakan PostgreSQL 16 dengan arsitektur relasional yang dioptimalkan untuk kecepatan baca dan integritas data.

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│          opd_settings           │           │             notulen             │
├─────────────────────────────────┤           ├─────────────────────────────────┤
│ PK  kode_unit (VARCHAR 20)      │           │ PK  id (UUID v4/v7)             │
│     opd_name (VARCHAR 255)      │           │     title (VARCHAR 500)         │
│     logo_url (VARCHAR 512)      │           │     meeting_date (DATE)         │
│     letterhead_config (JSONB)   │           │     start_time / end_time (TIME)│
│     address (TEXT)              │           │     location (VARCHAR 500)      │
│     phone (VARCHAR 50)          │           │     led_by / position / nip     │
│     email (VARCHAR 255)         │           │     signed_by / position / nip  │
│     created_at / updated_at     │           │     notulist_name / pos / nip   │
└─────────────────────────────────┘           │     input_type ('editor'/'upload│
                                              │     content (JSONB - Tiptap)    │
                                              │     file_url / file_name        │
                                              │     opd_code / opd_name         │
                                              │     created_by_sub / name       │
                                              │     status ('draft' / 'final')  │
                                              │     content_search (TSVECTOR)   │
                                              │     created_at / updated_at     │
                                              │     deleted_at (Soft Delete)    │
                                              └───────────────┬─────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    │ 1:N                                     │ 1:N                                     │ 1:N
                    ▼                                         ▼                                         ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────────────┐ ┌───────────────────────────────────────┐
│           notulen_attendees           │ │          notulen_attachments          │ │          notulen_auto_saves           │
├───────────────────────────────────────┤ ├───────────────────────────────────────┤ ├───────────────────────────────────────┤
│ PK  id (UUID)                         │ │ PK  id (UUID)                         │ │ PK  id (UUID)                         │
│ FK  notulen_id (UUID -> notulen)      │ │ FK  notulen_id (UUID -> notulen)      │ │ FK  notulen_id (UUID -> notulen)      │
│     name (VARCHAR 255)                │ │     file_name (VARCHAR 255)           │ │     content (JSONB)                   │
│     institution (VARCHAR 255)         │ │     file_url (VARCHAR 512)            │ │     saved_by_sub (UUID)               │
│     position (VARCHAR 255)            │ │     file_size (BIGINT)                │ │     saved_by_name (VARCHAR 255)       │
│     sort_order (INT)                  │ │     mime_type (VARCHAR 100)           │ │     created_at (TIMESTAMPTZ)          │
│     created_at (TIMESTAMPTZ)          │ │     sort_order (INT)                  │ └───────────────────────────────────────┘
└───────────────────────────────────────┘ │     created_at (TIMESTAMPTZ)          │
                                          └───────────────────────────────────────┘
```

### 5.1 Definisi Kolom Kunci & Indeks
1. **`notulen.content_search`:** Kolom hasil kalkulasi `GENERATED ALWAYS AS (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(summary, ''))) STORED` dengan indeks `USING GIN(content_search)`.
2. **`notulen.signed_by`, `signed_by_position`, `signed_by_nip`:** Kolom revisi untuk mengakomodasi pejabat pengesah yang berbeda dari pemimpin rapat.
3. **`notulen.deleted_at`:** Mengaktifkan mekanisme *Soft Delete* sehingga data yang dihapus dapat dipulihkan (*restore*) sewaktu-waktu dan dikecualikan dari query aktif melalui indeks parsial `WHERE deleted_at IS NULL`.
4. **`notulen_auto_saves`:** Menampung riwayat snapshot Tiptap secara berkala untuk audit trail pemulihan draf.

---

## 6. Rincian Endpoint REST API Backend

Seluruh endpoint privat wajib menyertakan header `Authorization: Bearer <Keycloak_Access_Token>`.

### 6.1 Endpoint Publik (Tanpa Autentikasi)
| Metode | Endpoint | Fungsi |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Pemeriksaan status ketersediaan server API Go |
| `GET` | `/api/v1/health/db` | Pemeriksaan koneksi pool database PostgreSQL |
| `GET` | `/api/v1/public/absensi/{id}` | Mengambil informasi dasar rapat untuk halaman QR Absensi |
| `POST`| `/api/v1/public/absensi/{id}` | Mengirim data presensi peserta rapat dari scan QR |
| `GET` | `/api/v1/public/opd` | Mengambil daftar OPD untuk dropdown instansi absensi |
| `GET` | `/api/v1/storage/*` | Smart Proxy pengiriman foto dan dokumen dari MinIO |

### 6.2 Endpoint Terotentikasi (Core & Pengaturan)
| Metode | Endpoint | Role | Fungsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/me` | All | Mendapatkan profil pengguna dan role aktif dari JWT |
| `GET` | `/api/v1/opd` | All | Proxy daftar SKPD dari API e-Kinerja Purbalingga (Cache 1 jam) |
| `GET` | `/api/v1/opd/{kodeUnit}/settings` | All | Mengambil konfigurasi kop surat OPD |
| `PUT` | `/api/v1/opd/{kodeUnit}/settings` | Admin, Operator | Memperbarui konfigurasi kop surat (alamat, kontak) |
| `POST`| `/api/v1/opd/{kodeUnit}/logo` | Admin, Operator | Mengunggah berkas logo resmi OPD ke MinIO |
| `GET` | `/api/v1/notulen` | All | Menampilkan daftar notulen (dengan paginasi, search, filter) |
| `POST`| `/api/v1/notulen` | All | Membuat entri notulen rapat baru |
| `GET` | `/api/v1/notulen/{id}` | All | Mengambil detail lengkap satu notulen beserta peserta & foto |
| `PUT` | `/api/v1/notulen/{id}` | All | Memperbarui data metadata & konten notulen |
| `DELETE`| `/api/v1/notulen/{id}` | All | Melakukan soft-delete notulen rapat |
| `PATCH`| `/api/v1/notulen/{id}/status` | All | Mengubah status notulen (`draft` <-> `final`) |
| `POST`| `/api/v1/notulen/{id}/restore`| Admin, Operator | Memulihkan notulen yang berada di tong sampah (*trash*) |
| `POST`| `/api/v1/notulen/{id}/duplicate`| All | Menduplikasi notulen menjadi draf baru |
| `POST`| `/api/v1/notulen/{id}/auto-save`| All | Menyimpan snapshot draf konten secara otomatis |
| `GET` | `/api/v1/notulen/{id}/auto-saves`| All | Mengambil riwayat snapshot auto-save |
| `GET` | `/api/v1/notulen/{id}/pdf` | All | Mengunduh dokumen PDF resmi dengan Kop Surat & TTD |
| `GET` | `/api/v1/notulen/{id}/word` | All | Mengunduh dokumen Microsoft Word (`.docx`) |
| `POST`| `/api/v1/notulen/{id}/upload-doc`| All | Mengunggah berkas PDF/DOCX fisik pengganti editor |
| `POST`| `/api/v1/notulen/{id}/attachments`| All | Mengunggah foto dokumentasi kegiatan rapat |
| `DELETE`| `/api/v1/notulen/{id}/attachments/{attId}`| All | Menghapus lampiran foto dokumentasi |
| `GET` | `/api/v1/search` | All | Pencarian cepat full-text judul dan isi notulen |
| `GET` | `/api/v1/dashboard/stats` | All | Mengambil metrik statistik dashboard sesuai role |
| `GET` | `/api/v1/reports/summary` | Admin, Operator | Mengambil ringkasan data laporan rekapitulasi |
| `GET` | `/api/v1/reports/activities` | Admin, Operator | Mengambil tabel data rincian kegiatan rapat untuk rekap |

---

## 7. Desain Antarmuka & Standar UI/UX

Sistem dirancang mengacu pada pedoman `DESIGN.md` dengan filosofi **Fresh, Modern, and Functional Elegance**:
- **Palet Warna Utama (Deep Emerald & Slate Blue):**
  - Primary: Emerald `#059669` / `#047857` (melambangkan integritas pemerintahan, ketenangan, dan kesegaran).
  - Neutral / Secondary: Slate `#0F172A` / `#334155` (menghasilkan kontras keterbacaan teks yang tinggi).
  - Accent / Warning: Amber `#F59E0B` (indikator status draf dan notifikasi peringatan).
- **Tipografi:**
  - Teks Antarmuka Web: *Plus Jakarta Sans* / *Inter* untuk kejelasan label navigasi, tombol, dan tabel data.
  - Teks Kanvas Dokumen & PDF: *Times New Roman* standar naskah dinas resmi Republik Indonesia.
- **Responsivitas & Aksesibilitas:**
  - Tampilan optimal pada monitor desktop kantor, laptop dinas, maupun tablet inspeksi lapangan.
  - Indikator pemuatan (*Skeleton loaders*) pada setiap tabel data dan detail notulen.
  - Pesan konfirmasi modal (*ConfirmDialog*) pada setiap aksi destruktif (Hapus, Buang ke Trash, Duplikasi).
  - Toast Notification real-time untuk memberi umpan balik instan pada setiap aksi penyimpanan atau kegagalan koneksi.

---

## 8. Persyaratan Non-Fungsional (NFR) & Aspek Keamanan

### 8.1 Keamanan Sistem (Security)
1. **OIDC Token Validation:** Setiap request API diverifikasi signature-nya terhadap JWKS public key Keycloak yang di-cache secara berkala.
2. **Data Isolation (Multi-Tenancy OPD):** Pengguna dengan role `operator` dan `officer` secara mutlak tidak dapat membaca atau memodifikasi notulen milik OPD lain pada level query database (`WHERE opd_code = $1`).
3. **Penyimpanan Berkas Aman:** Berkas fisik tidak disimpan pada public web server root, melainkan di-stream melalui internal storage proxy setelah divalidasi MIME type dan ekstensi berkasnya.
4. **Sanitasi Masukan:** Menggunakan HTML/Text sanitizer sebelum teks disimpan ke database atau di-render ke PDF guna menangkal celah XSS dan PDF injection.

### 8.2 Performa & Keandalan (Performance & Reliability)
1. **Waktu Muat Cepat:** Waktu respon API backend rata-rata di bawah 100ms untuk query transaksional.
2. **Caching API Eksternal:** Respon daftar OPD dari e-Kinerja di-cache dalam memory Go selama 1 jam untuk mencegah latensi dan beban berlebih pada server kepegawaian.
3. **Optimasi Berkas:** Kompresi gambar dinamis mengurangi ukuran payload foto dokumentasi hingga 70% tanpa mengurangi keterbacaan pada cetak fisik.
4. **Graceful Shutdown:** Server Go menangani sinyal `SIGINT` dan `SIGTERM` dengan waktu toleransi 10 detik guna memastikan transaksi database selesai dengan tuntas sebelum proses dimatikan.

---

## 9. Matriks Riwayat Pembaruan & Revisi (Changelog)

| Versi / Commit | Kategori | Ringkasan Pembaruan & Solusi yang Diterapkan |
| :--- | :--- | :--- |
| **v1.0 (Initial)** | Core System | Implementasi dasar Clean Architecture Go, CRUD Notulen, integrasi Keycloak, PostgreSQL schema, dan MinIO storage. |
| **v1.2 (Storage & Fix)** | Storage / MinIO | Refactor unggah dokumen PDF fisik menggunakan Backend API Proxy (`/upload-doc`) tanpa koneksi langsung ke port 9000 MinIO. Implementasi fuzzy path matching, unescape URL, dan fallback bucket pada `ServeObject`. |
| **v1.5 (Pimpinan TTD)** | Database & PDF | Penambahan kolom dan field `signed_by`, `signed_by_position`, dan `signed_by_nip` terpisah dari pemimpin rapat. Penyesuaian layout blok tanda tangan PDF. |
| **v1.8 (Word Export)** | Dokumen Engine | Implementasi generator dokumen Microsoft Word (`.docx`) melalui `/api/v1/notulen/{id}/word` lengkap dengan kop surat dan tabel dinas. |
| **v2.0 (QR Presensi)** | Public Feature | Penambahan rute publik `/absensi/[id]`, modal QR Code SVG dinamis di tabel peserta, dan endpoint absensi mandiri tanpa autentikasi. |
| **v2.1 (UX & Navigasi)**| UX Enhancement | Penambahan `AutoSaveBadge` real-time di sticky header dan Tiptap toolbar, Global Command Palette (`Ctrl + K`), dialog konfirmasi duplikasi, dan instant cursor focus pada kanvas editor. |
| **v2.2 (Final PRD)** | Dokumentasi | Konsolidasi seluruh fungsionalitas, arsitektur, dan revisi mutakhir ke dalam Product Requirement Document (PRD) resmi. |

---

## 10. Panduan Pengujian & Deployment

### 10.1 Verifikasi Mandiri Fitur (Test Scenarios)
1. **Skenario Login SSO & Role Switching:**
   - Login menggunakan akun Admin -> Pastikan dapat melihat notulen semua OPD dan dapat memilih instansi saat membuat notulen baru.
   - Login menggunakan Operator OPD -> Pastikan hanya dapat melihat notulen dari OPD terdaftar dan kop surat OPD-nya sendiri.
2. **Skenario Penulisan & Auto-Save:**
   - Buat notulen baru, ketik pada editor kanvas -> Amati `AutoSaveBadge` berubah menjadi "Menyimpan..." dan kembali "Tersimpan". Buka tab jaringan, pastikan endpoint `/auto-save` merespon 200 OK.
3. **Skenario Absensi QR Code:**
   - Buka tab Peserta Rapat -> Klik tombol "QR Code Absensi" -> Pindai QR Code menggunakan perangkat ponsel -> Isi data presensi -> Pastikan nama peserta langsung bertambah pada tabel peserta rapat.
4. **Skenario Ekspor PDF & Word:**
   - Buka notulen berstatus Final -> Klik "PDF" -> Pastikan kop surat ganda, logo, tabel peserta, blok tanda tangan pimpinan penanda tangan & notulis, serta foto dokumentasi tampil presisi.
   - Klik "Word" -> Pastikan berkas `.docx` terunduh dan dapat dibuka sempurna di Microsoft Word.

### 10.2 Deployment Stack
Sistem disiapkan untuk dijalankan melalui Docker Compose:
- **Development:** `docker compose -f docker-compose.dev.yml up -d` (PostgreSQL & MinIO lokal).
- **Production Stack:** `docker compose up -d --build` (Next.js port 3004, Go Backend port 8080, PostgreSQL port 5430, MinIO terkelola).
