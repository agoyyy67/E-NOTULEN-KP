# FEATURES.md — Spesifikasi Lengkap Fitur Aplikasi e-Notulen

## 📋 Overview

Dokumen ini berisi daftar lengkap dan terperinci fitur-fitur pada aplikasi **e-Notulen** Pemerintah Kabupaten Purbalingga, mencakup seluruh kapabilitas fungsional, integrasi data, hak akses per role, dan status kesiapan operasional terkini.

### Legenda Status Implementasi
| Label | Arti |
| ----- | ---- |
| ✅ **Selesai (Production Ready)** | Fitur telah terimplementasi penuh di backend (Go), database (PostgreSQL), dan frontend (Next.js 15) |
| 🔄 **Penyempurnaan / Active** | Fitur aktif beroperasi, dalam tahap penyempurnaan berkala atau optimalisasi performa |
| ⏳ **Planned / Roadmap** | Fitur yang direncanakan untuk pengembangan masa mendatang |

### Legenda Prioritas (MoSCoW Method)
| Label | Arti | Keterangan |
| ----- | ---- | ---------- |
| 🔴 **P0** | Must Have | Fitur inti mutlak (Core MVP), sistem tidak dapat beroperasi tanpanya |
| 🟡 **P1** | Should Have | Fitur esensial untuk kenyamanan operasional dan otomasi tata naskah dinas |
| 🟢 **P2** | Nice to Have | Fitur penyempurnaan pengalaman pengguna tingkat lanjut |

### Legenda Hak Akses Pengguna (Role System)
| Kode | Nama Role | Cakupan Wilayah Akses Data |
| ---- | --------- | -------------------------- |
| **A** | **Super Admin** | Akses penuh lintas seluruh OPD se-Kabupaten Purbalingga |
| **O** | **Operator OPD** | Dibatasi secara ketat hanya pada lingkup satuan kerjanya (`opd_code` / `kode_unit`) |
| **F** | **Officer / Notulis** | Dibatasi hanya pada dokumen risalah rapat yang ia buat sendiri (`created_by_sub`) |
| **P** | **Publik / Tamu Rapat** | Akses formulir absensi mandiri tanpa memerlukan login akun SSO |

### Arsitektur Sumber Data & Integrasi
| Kategori Data | Sumber Utama | Mekanisme & Protokol |
| ------------- | ------------ | -------------------- |
| **Pengguna & Sesi** | Keycloak SSO Purbalingga (`accounts.purbalinggakab.go.id`) | OIDC Authorization Code Flow + Local JWT Validation via JWKS |
| **Master SKPD / OPD** | API Pegawai E-Kinerja Pemkab Purbalingga | REST API HTTP via Backend Proxy + In-Memory Cache (TTL: 1 Jam) |
| **Data Transaksional** | PostgreSQL 16 (Local Database) | pgxpool v5 Native Driver + Full-Text Search TSVECTOR GIN Index |
| **Berkas & Dokumentasi**| MinIO Object Storage (Internal S3) | Akses aman via Backend Smart Storage Proxy (`/api/v1/storage/*`) |
| **Kompilasi Dokumen** | Native Go Compilation Engine | gofpdf (PDF resmi A4) & pure OOXML zip writer (Word `.docx`) |

---

## 1. 🔐 Modul Autentikasi & Pengelolaan Sesi

| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 1.1 | Login via Keycloak OIDC SSO | 🔴 P0 | A/O/F | ✅ Selesai | Autentikasi terpusat terintegrasi dengan Keycloak Pemkab Purbalingga. Pengguna diarahkan ke SSO dan kembali dengan authorization code |
| 1.2 | Logout Terpadu | 🔴 P0 | A/O/F | ✅ Selesai | Mengakhiri sesi lokal, menghapus cookie HttpOnly secure, dan menembak endpoint logout Keycloak |
| 1.3 | Background Token Refresh | 🔴 P0 | A/O/F | ✅ Selesai | Next.js middleware & Axios interceptor memperbarui token akses secara otomatis sebelum masa berlakunya habis |
| 1.4 | Session Protection & Route Guards | 🔴 P0 | A/O/F | ✅ Selesai | Perlindungan seluruh rute privat; request unauthenticated otomatis dialihkan ke `/login` |
| 1.5 | Ekstraksi Konteks Pengguna JWT | 🔴 P0 | A/O/F | ✅ Selesai | Mengekstrak identitas ASN (Nama, NIP, Jabatan, OPD, Role) langsung dari klaim token tanpa query database |
| 1.6 | DevRoleSwitcher Widget (Khusus Dev) | 🟡 P1 | All | ✅ Selesai | Widget floating di pojok layar untuk berpindah peran (Admin, Operator, Officer) dalam lingkungan development |

---

## 2. 📊 Modul Dashboard & Analitik

| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 2.1 | Dashboard Overview Metrics | 🔴 P0 | A/O/F | ✅ Selesai | Tampilan kartu ringkasan: Total Risalah Rapat, Rapat Bulan Ini, dan Rasio Dokumen Draft vs Final |
| 2.2 | Notulen Rapat Terbaru | 🔴 P0 | A/O/F | ✅ Selesai | Daftar feed 5-10 risalah rapat terakhir dengan filter otomatis sesuai cakupan kewenangan role pengguna |
| 2.3 | Grafik Tren Notulen Bulanan | 🟡 P1 | A/O | ✅ Selesai | Visualisasi grafik batang/garis 12 bulan terakhir menggunakan Recharts (`MonthlyTrendChart`) |
| 2.4 | Peringkat Aktivitas Rapat OPD | 🟡 P1 | A | ✅ Selesai | Bar chart horizontal interaktif pemeringkat keaktifan OPD se-kabupaten (`OpdRankChart`) |
| 2.5 | Pintasan Aksi Cepat (Quick Actions) | 🟡 P1 | A/O/F | ✅ Selesai | Tombol pintasan langsung untuk membuat notulen, membuka laporan, dan melihat daftar risalah |

---

## 3. 📝 Modul Inti Notulen Rapat

### 3.1 Manajemen Dokumen Risalah
| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 3.1.1 | Pembuatan Notulen Baru | 🔴 P0 | A/O/F | ✅ Selesai | Formulir pembuatan risalah rapat baru dengan pengisian metadata dan agenda rapat lengkap |
| 3.1.2 | Penyuntingan Notulen | 🔴 P0 | A/O/F | ✅ Selesai | Kemampuan mengubah konten rapat, peserta, dan dokumentasi dengan validasi otorisasi kepemilikan |
| 3.1.3 | Soft Delete (Tempat Sampah) | 🔴 P0 | A/O/F | ✅ Selesai | Menandai dokumen dengan stempel `deleted_at` tanpa menghapus data secara permanen |
| 3.1.4 | Pemulihan Dokumen (Restore) | 🟡 P1 | A/O | ✅ Selesai | Mengembalikan dokumen yang berada di tempat sampah (`/restore`) menjadi dokumen aktif |
| 3.1.5 | Duplikasi Notulen (Template) | 🟡 P1 | A/O/F | ✅ Selesai | Mengkloning seluruh metadata, daftar hadir, dan konten notulen menjadi draf baru dengan modal konfirmasi |
| 3.1.6 | Siklus Status (Draft & Final) | 🔴 P0 | A/O/F | ✅ Selesai | Peralihan status antara draf kerja yang fleksibel dan status dokumen final yang disahkan |
| 3.1.7 | Tampilan Detail Notulen Resmi | 🔴 P0 | A/O/F | ✅ Selesai | Tampilan read-only bergaya naskah dinas formal ber-kop surat dinas dan berblok tanda tangan |

### 3.2 Penanganan Metadata & Penanda Tangan Dokumen
| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 3.2.1 | Tanggal & Waktu Fleksibel | 🔴 P0 | A/O/F | ✅ Selesai | Datepicker tanggal rapat, input jam mulai dan jam selesai (dengan opsi checkbox "s.d. Selesai") |
| 3.2.2 | Lokasi & Tempat Rapat | 🔴 P0 | A/O/F | ✅ Selesai | Pencatatan detail ruang rapat fisik atau platform virtual (Zoom/Meet) |
| 3.2.3 | Identitas Pemimpin Rapat Fisik | 🔴 P0 | A/O/F | ✅ Selesai | Nama lengkap, gelar, jabatan dinas, dan NIP pimpinan yang memimpin jalannya rapat |
| 3.2.4 | Pejabat Penanda Tangan Terpisah | 🔴 P0 | A/O/F | ✅ Selesai | Opsi khusus menetapkan pejabat penanda tangan (`signed_by`, `signed_by_position`, `signed_by_nip`) jika berbeda dari pemimpin rapat fisik |
| 3.2.5 | Identitas Notulis / Pencatat | 🔴 P0 | A/O/F | ✅ Selesai | Nama lengkap, jabatan, dan NIP pegawai yang bertugas menyusun risalah rapat |
| 3.2.6 | Penguncian Otomatis OPD | 🔴 P0 | A/O/F | ✅ Selesai | Terisi otomatis dari JWT untuk Operator/Officer; dapat dipilih bebas oleh Super Admin |
| 3.2.7 | Mode Input Dokumen Ganda | 🔴 P0 | A/O/F | ✅ Selesai | Pilihan mode: **Tulis Langsung (Rich Text Editor Tiptap)** atau **Unggah Dokumen Fisik PDF** |

### 3.3 Editor Dokumen Digital (Tiptap Engine)
| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 3.3.1 | Text Formatting | 🔴 P0 | A/O/F | ✅ Selesai | Bold, Italic, Underline, Strikethrough, Text Color, dan Highlight teks |
| 3.3.2 | Heading & Struktur Naskah | 🔴 P0 | A/O/F | ✅ Selesai | Heading level 1, 2, 3 untuk memisahkan bab pembukaan, pembahasan, dan kesimpulan |
| 3.3.3 | List & Penomoran Otomatis | 🔴 P0 | A/O/F | ✅ Selesai | Bullet list, ordered numbered list, dan task checklist |
| 3.3.4 | Tabel Dinamis Terstruktur | 🟡 P1 | A/O/F | ✅ Selesai | Sisip tabel, atur baris/kolom, merge cells untuk matriks rencana tindak lanjut kegiatan |
| 3.3.5 | Kanvas Kertas A4 (Click-to-Focus)| 🟡 P1 | A/O/F | ✅ Selesai | Desain berbingkai lembar kertas putih; klik di mana saja pada lembar kertas langsung mengaktifkan kursor |
| 3.3.6 | Undo & Redo History | 🔴 P0 | A/O/F | ✅ Selesai | Tombol dan keyboard shortcut (Ctrl+Z / Ctrl+Y) untuk membatalkan revisi pengetikan |

### 3.4 Penyimpanan Otomatis (Auto-Save) & Indikator Status
| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 3.4.1 | Debounced Auto-Save 2 Detik | 🔴 P0 | A/O/F | ✅ Selesai | Konten otomatis tersimpan ke server 2 detik setelah pengguna berhenti mengetik |
| 3.4.2 | Real-Time AutoSaveBadge | 🔴 P0 | A/O/F | ✅ Selesai | Indikator visual 4 kondisi: `idle`, `saving` (animasi spinner), `saved` (jam tersimpan), `error` |
| 3.4.3 | Snapshot Riwayat Auto-Save | 🟡 P1 | A/O/F | ✅ Selesai | Setiap auto-save tercatat sebagai snapshot di tabel `notulen_auto_saves` |

### 3.5 Daftar Hadir Internal & Absensi Publik (QR Code)
| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 3.5.1 | Input Peserta Manual | 🔴 P0 | A/O/F | ✅ Selesai | Menambah, menyunting, dan menghapus nama peserta rapat, asal instansi, dan jabatan |
| 3.5.2 | Combobox Instansi Cerdas | 🟡 P1 | A/O/F | ✅ Selesai | Autocomplete pencarian instansi dinas terintegrasi daftar SKPD resmi Pemkab Purbalingga |
| 3.5.3 | Halaman Absensi Tamu Mandiri | 🔴 P0 | P | ✅ Selesai | Halaman publik ramah smartphone di `/absensi/[id]` untuk registrasi kehadiran peserta mandiri |
| 3.5.4 | Generator QR Code Absensi | 🔴 P0 | A/O/F | ✅ Selesai | Modal QR Code pada form dan detail rapat yang siap dipindai kamera HP tamu rapat |
| 3.5.5 | Endpoint Publik Tanpa Auth | 🔴 P0 | P | ✅ Selesai | `GET /api/v1/public/absensi/{id}` dan `POST /api/v1/public/absensi/{id}` |

### 3.6 Dokumentasi Foto Kegiatan Rapat
| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 3.6.1 | Multi-Upload Foto Rapat | 🔴 P0 | A/O/F | ✅ Selesai | Mengunggah banyak foto kegiatan (JPG, PNG, WebP) ke MinIO via Backend Proxy |
| 3.6.2 | Galeri Dokumentasi Interaktif | 🔴 P0 | A/O/F | ✅ Selesai | Grid pratinjau thumbnail foto rapat dengan fitur hapus berkas |
| 3.6.3 | Lampiran Foto pada Dokumen | 🟡 P1 | A/O/F | ✅ Selesai | Foto dokumentasi otomatis dikompilasi ke halaman lampiran pada dokumen PDF & Word |

---

## 4. 📥 Modul Ekspor Dokumen Resmi Kedinasan

| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 4.1 | Ekspor PDF Resmi Ber-Kop Surat | 🔴 P0 | A/O/F | ✅ Selesai | Mengenerate dokumen PDF resmi A4 lengkap dengan logo dinas, kop surat, tabel, isi, TTD, dan foto |
| 4.2 | Ekspor Microsoft Word (.docx) Murni | 🔴 P0 | A/O/F | ✅ Selesai | Mesin generator DOCX native Go berbasis ECMA-376 OOXML tanpa ketergantungan LibreOffice/MS Word |
| 4.3 | Unduh Berkas Fisik Asli | 🔴 P0 | A/O/F | ✅ Selesai | Mengunduh file scan PDF yang diunggah pengguna melalui Smart Storage Proxy backend |
| 4.4 | Cetak Langsung (Print-Friendly Layout)| 🟡 P1 | A/O/F | ✅ Selesai | CSS `@media print` khusus yang membersihkan sidebar dan navigasi untuk pencetakan dokumen fisik |

---

## 5. 🔍 Modul Pencarian Cepat & Navigasi

| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 5.1 | Global Command Palette (`Ctrl + K`) | 🔴 P0 | A/O/F | ✅ Selesai | Modal pencarian cepat keyboard-first untuk navigasi halaman dan eksekusi aksi kilat |
| 5.2 | Full-Text Search PostgreSQL (GIN) | 🔴 P0 | A/O/F | ✅ Selesai | Indeks TSVECTOR pada judul dan ringkasan untuk pencarian dokumen berkecepatan tinggi |
| 5.3 | Filter Multi-Kriteria | 🔴 P0 | A/O/F | ✅ Selesai | Penyaringan daftar notulen berdasarkan OPD, status draf/final, dan rentang tanggal |
| 5.4 | Sorting Fleksibel | 🔴 P0 | A/O/F | ✅ Selesai | Pengurutan berdasarkan tanggal pelaksanaan terbaru, terlama, maupun abjad judul |

---

## 6. 📈 Modul Rekapitulasi & Pelaporan Rapat

| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 6.1 | Halaman Rekapitulasi Rapat (`/reports`) | 🔴 P0 | A/O | ✅ Selesai | Dashboard metrik pelaporan: total kegiatan, rapat terlaksana, dan jumlah total peserta hadir |
| 6.2 | Filter Periode & OPD Laporan | 🔴 P0 | A/O | ✅ Selesai | Menyesuaikan rekap berdasarkan tanggal awal, tanggal akhir, status, dan instansi penyelenggara |
| 6.3 | Ekspor Data ke Format CSV / Excel | 🔴 P0 | A/O | ✅ Selesai | Mengunduh tabel rekapitulasi data rapat dalam format spreadsheet terstruktur (.csv) |
| 6.4 | Format Cetak Laporan Kedinasan | 🟡 P1 | A/O | ✅ Selesai | Tampilan laporan formal yang memuat kop surat dinas siap cetak untuk diserahkan ke pimpinan |

---

## 7. 🏢 Modul Pengaturan Kop Surat OPD

| # | Fitur | Prioritas | Role | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ---- | ------ | ---------------------------------- |
| 7.1 | Konfigurasi Identitas Kop Surat | 🔴 P0 | A/O | ✅ Selesai | Form pengaturan nama dinas, nama pemda, alamat kantor, kode pos, nomor telepon, fax, dan surel |
| 7.2 | Live Preview Kop Surat Interaktif | 🔴 P0 | A/O | ✅ Selesai | Pratinjau real-time wujud kop dinas lengkap dengan garis ganda naskah dinas saat mengetik |
| 7.3 | Unggah Logo Dinas via Backend Proxy | 🔴 P0 | A/O | ✅ Selesai | Upload file logo instansi (JPG/PNG maks 2MB) langsung disimpan ke MinIO melalui proxy API backend |
| 7.4 | Multi-OPD Switcher (Super Admin) | 🔴 P0 | A | ✅ Selesai | Kemampuan Super Admin mengatur dan meninjau kop surat seluruh dinas se-kabupaten |

---

## 8. 🛠️ Modul Sistem, Infrastruktur & Storage Proxy

| # | Fitur | Prioritas | Status | Deskripsi Teknis & Perilaku Sistem |
| - | ----- | --------- | ------ | ---------------------------------- |
| 8.1 | Smart Storage Proxy (`/api/v1/storage/*`) | 🔴 P0 | ✅ Selesai | Streaming berkas internal MinIO ke browser dengan unescape path, suffix matching, dan multi-bucket fallback |
| 8.2 | Backend Direct Upload Proxy (`/upload-doc`)| 🔴 P0 | ✅ Selesai | Unggah berkas dokumen fisik langsung via API backend tanpa memerlukan direct client presigned URL |
| 8.3 | Healthcheck Endpoints | 🔴 P0 | ✅ Selesai | Endpoint `/health` dan `/health/db` untuk monitoring kesiapan backend API dan database PostgreSQL |
| 8.4 | Structured JSON Logging & Panic Recovery | 🔴 P0 | ✅ Selesai | Middleware logging HTTP terstruktur dan pemulihan otomatis dari runtime panic |
| 8.5 | Auto-Migration Skema Startup | 🔴 P0 | ✅ Selesai | Database PostgreSQL otomatis menerapkan skema SQL saat service backend pertama kali menyala |
