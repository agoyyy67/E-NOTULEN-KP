# DESIGN.md — Design System & Panduan UI/UX e-Notulen

## 🎨 1. Filosofi Desain

Aplikasi **e-Notulen** Pemerintah Kabupaten Purbalingga dibangun berlandaskan prinsip **Functional Governance & Modern Elegance**:
1. **Kejelasan Birokrasi (Clarity & Hierarchy)**: Penataan tata letak dokumen kedinasan yang formal, rapi, dan mudah dipahami oleh aparatur sipil negara lintas generasi.
2. **Kesesuaian Tata Naskah Dinas**: Dokumen digital (di layar maupun hasil cetak) mengikuti kaidah naskah dinas resmi pemerintah daerah (Perbup Tata Naskah Dinas).
3. **Mobile-First untuk Partisipan Publik**: Antarmuka bagi peserta rapat tamu (formulir absensi mandiri) dirancang sangat ringan, cepat, dan intuitif di layar smartphone.
4. **Produktivitas Berbasis Keyboard**: Menyediakan pintasan navigasi global via Command Palette (`Ctrl + K`) dan canvas editor dengan delegasi klik instan (*click-to-focus*).

---

## 🎨 2. Sistem Warna (Color System Tokens)

### Palet Utama — Deep Teal (Identitas Aplikasi)
Warna utama merepresentasikan profesionalisme, stabilitas, dan keterbukaan layanan publik modern.

```css
--color-primary-50:  #ECFDF5;  /* Background elemen aktif ringan */
--color-primary-100: #D1FAE5;  /* Tag / Badge background */
--color-primary-200: #A7F3D0;  /* Border aksen halus */
--color-primary-300: #6EE7B7;  /* Hover subtle */
--color-primary-400: #34D399;  /* Progress bar / Grafik aksen */
--color-primary-500: #10B981;  /* Tombol utama & highlight */
--color-primary-600: #059669;  /* Primary brand base */
--color-primary-700: #047857;  /* Hover tombol utama */
--color-primary-800: #065F46;  /* Heading aksen gelap */
--color-primary-900: #064E3B;  /* Deep brand container */
--color-primary-950: #022C22;
```

### Palet Sekunder — Slate Blue (Struktur & Tipografi)
Digunakan untuk struktur layout, sidebar gelap, pembatas, dan teks bacaan.

```css
--color-secondary-50:  #F8FAFC;  /* Canvas background */
--color-secondary-100: #F1F5F9;  /* Background kartu & input */
--color-secondary-200: #E2E8F0;  /* Garis border standar */
--color-secondary-300: #CBD5E1;  /* Border aktif */
--color-secondary-400: #94A3B8;  /* Placeholder & label sekunder */
--color-secondary-500: #64748B;  /* Teks pendukung */
--color-secondary-600: #475569;  /* Teks body sekunder */
--color-secondary-700: #334155;  /* Teks body utama */
--color-secondary-800: #1E293B;  /* Sub-heading & sidebar hover */
--color-secondary-900: #0F172A;  /* Heading utama & sidebar gelap */
--color-secondary-950: #020617;
```

### Palet Semantik & Status Dokumen
```css
/* Sukses / Dokumen Final / Tersimpan */
--color-success:       #10B981;
--color-success-light: #ECFDF5;
--color-success-border:#A7F3D0;
--color-success-dark:  #065F46;

/* Peringatan / Menyimpan Draf */
--color-warning:       #F59E0B;
--color-warning-light: #FFFBEB;
--color-warning-border:#FDE68A;
--color-warning-dark:  #92400E;

/* Bahaya / Gagal / Hapus Dokumen */
--color-danger:        #EF4444;
--color-danger-light:  #FEF2F2;
--color-danger-border: #FECACA;
--color-danger-dark:   #991B1B;

/* Informasi / Panduan */
--color-info:          #3B82F6;
--color-info-light:    #EFF6FF;
--color-info-border:   #BFDBFE;
--color-info-dark:     #1E40AF;
```

---

## 🔤 3. Tipografi & Hierarki Teks

### Font Family
```css
/* Antarmuka Utama & Formulir */
font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Identifikasi NIP, Nomor Surat, & Kode Unit SKPD */
font-family: 'JetBrains Mono', 'Fira Code', monospace;

/* Tampilan Dokumen Naskah Dinas Resmi (PDF & Word Engine) */
font-family: 'Times New Roman', 'Liberation Serif', serif;
```

### Skala Ukuran Teks (Type Scale)
| Token | Ukuran | Bobot Font | Line Height | Penggunaan dalam Antarmuka |
| ----- | ------ | ---------- | ----------- | -------------------------- |
| `display` | 32px | Bold (700) | 1.25 | Judul hero metrik dashboard |
| `h1` | 24px | Bold (700) | 1.3 | Judul halaman utama (e.g. "Daftar Notulen Rapat") |
| `h2` | 20px | SemiBold (600) | 1.35 | Judul bagian / section kartu formulir |
| `h3` | 16px | SemiBold (600) | 1.4 | Judul sub-seksi, header modal dialog |
| `body-lg` | 15px | Regular (400) | 1.55 | Teks pengantar dokumen |
| `body-base` | 14px | Regular (400) | 1.5 | Teks isi formulir & baris data tabel |
| `body-sm` | 13px | Regular (400) | 1.5 | Label input & petunjuk pembantu |
| `caption` | 12px | Medium (500) | 1.4 | Header kolom tabel & timestamp |
| `tiny` | 11px | SemiBold (600) | 1.3 | Badge status, pill AutoSaveBadge |

---

## 📐 4. Sistem Spasi & Radius Kontainer

Menggunakan sistem kelipatan modular **4px**:
- Spasi antar elemen mikro: `4px` (xs), `8px` (sm), `12px` (md)
- Padding kartu & form: `16px` (base), `20px` (lg), `24px` (xl)
- Gap antar bagian besar: `32px` (2xl), `48px` (3xl)

Border Radius:
- Input & Tombol: `8px` (`rounded-lg`)
- Kartu & Modal Dialog: `12px` / `16px` (`rounded-xl` / `rounded-2xl`)
- Pill Badge & Status: `9999px` (`rounded-full`)

---

## 🧩 5. Spesifikasi Komponen Kunci

### 1. Global Command Palette (`Ctrl + K`)
- **Pemicu**: Shortcut keyboard `Ctrl + K` (Windows/Linux) atau `Cmd + K` (macOS), atau klik ikon pencarian pada top bar navigasi.
- **Backdrop**: Layar penuh hitam ber-opacity 40% dengan efek `backdrop-blur-sm`.
- **Dimensi Modal**: Lebar `640px`, posisi vertikal `top-20`, `rounded-2xl`, background putih bersih, shadow mendalam (`shadow-2xl`).
- **Elemen Input**: Input teks tanpa outline berukuran `16px` dilengkapi ikon kaca pembesar dan penunjuk tombol `Esc`.
- **Pengelompokan Hasil**:
  - *Navigasi Utama*: Dashboard, Daftar Notulen, Buat Notulen Baru.
  - *Pelaporan & Rekap*: Rekap Bulanan, Peringkat Aktivitas OPD.
  - *Pengaturan Sistem*: Konfigurasi Kop Surat Dinas, Profil Pengguna ASN.
- **Interaktivitas**: Navigasi panah atas/bawah keyboard [↑/↓] dengan indikator bar penanda hijau teal, dan eksekusi instan via tombol [Enter].

### 2. Indikator Real-Time `AutoSaveBadge`
Pill badge yang disematkan di pojok kanan header editor dan toolbar:
- **Ukuran**: `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border`.
- **4 Kondisi Status**:
  1. `saving`: Background `amber-50`, teks `amber-700`, border `amber-200`, ikon `Loader2` berputar animasi. Menampilkan label *"Menyimpan draft..."*.
  2. `saved`: Background `emerald-50`, teks `emerald-700`, border `emerald-200`, ikon `CheckCircle2`. Menampilkan label *"Tersimpan pukul HH:mm"*.
  3. `error`: Background `rose-50`, teks `rose-700`, border `rose-200`, ikon `AlertCircle` berdenyut merah. Menampilkan label *"Gagal menyimpan"*.
  4. `idle`: Background `slate-50`, teks `slate-600`, border `slate-200`, ikon `Cloud`. Menampilkan waktu terakhir tersimpan.

### 3. Kanvas Editor Tiptap Bergaya Kertas A4
- **Sensasi Lembar Kertas**: Area editor berlatar belakang abu-abu sejuk (`#F8FAFC`) dengan lembar kertas putih (`#FFFFFF`) berbayangan tipis di bagian tengah.
- **Fitur Click-to-Focus**: Seluruh area pembungkus kertas memiliki event listener delegasi fokus; klik di sembarang area lembar kertas otomatis mengarahkan kursor pengetikan ke baris aktif.
- **Toolbar Sticky**: Tetap menempel di bagian atas layar saat pengguna menggulir naskah rapat yang panjang.
- **Pemisah Grup Alat**: Garis vertikal 1px memisahkan alat format teks, judul heading, daftar penomoran, tabel, dan undo/redo.

### 4. Formulir Absensi Tamu Mandiri (`/absensi/[id]`)
- **Tata Letak Mobile-First**: Kartu tunggal di tengah layar tanpa gangguan sidebar aplikasi kantor, didesain untuk layar smartphone 360px–480px.
- **Chip Informasi Rapat**: Blok informasi ringkas agenda, tanggal berformat Indonesia, waktu, ruang rapat, dan instansi penyelenggara.
- **Pilihan Instansi Cerdas**: Komponen `Combobox` terintegrasi daftar SKPD Pemkab Purbalingga dengan pencarian autocomplete instan atau opsi ketik instansi luar.
- **Konfirmasi Kehadiran**: Animasi tanda centang hijau dan ringkasan kehadiran pasca-pengiriman.

### 5. Blok Pengesahan Tanda Tangan Ganda (`SignatureSection`)
- **Tata Letak 2 Kolom Kedinasan**:
  - Kolom Kiri: Pejabat Penanda Tangan (Jabatan, Area tanda tangan bertinggi 80px, Nama lengkap bold bergaris bawah, NIP).
  - Kolom Kanan: Tempat & Tanggal pembuatan dokumen ("Purbalingga, [Tanggal Rapat]"), Jabatan Notulis, Area tanda tangan, Nama Notulis bergaris bawah, NIP.
- **Fleksibilitas Pejabat**: Mendukung penugasan terpisah antara pimpinan rapat di lapangan dengan pejabat definitif penanda tangan risalah dinas.

### 6. Pratinjau Interaktif Kop Surat (`/settings/opd`)
- **WYSIWYG Live Preview**: Penelusuran real-time wujud kop surat dinas secara langsung saat operator mengubah alamat kantor atau mengunggah logo instansi.
- **Standar Kepala Surat Pemda**:
  - Logo resmi Kabupaten Purbalingga / OPD di sisi kiri dengan dimensi proporsional.
  - Teks Tengah: Baris 1 "PEMERINTAH KABUPATEN PURBALINGGA" (14pt bold uppercase), Baris 2 Nama Dinas (16pt bold uppercase), Baris 3 Alamat jalan, nomor telepon, fax, email, dan kode pos (10pt regular).
  - Garis Pembatas Ganda: Garis tebal 2px diikuti garis tipis 1px sebagai pemisah resmi kop surat.

---

## 📊 6. Komponen Visualisasi Data (Recharts)

### 1. `MonthlyTrendChart` (Tren Rapat 12 Bulan)
- **Komponen**: Responsive container dengan Bar/Line Chart kombinasi.
- **Warna Batang**: Gradient Deep Teal (`--color-primary-500` ke `--color-primary-700`).
- **Tooltip**: Kartu mengambang berlatar putih dengan sudut melengkung 8px dan bayangan halus.

### 2. `OpdRankChart` (Peringkat Keaktifan Rapat OPD)
- **Komponen**: Horizontal BarChart (layout vertikal) agar nama dinas yang panjang dapat terbaca jelas.
- **Pemotongan Teks Otomatis**: Label dinas otomatis dipotong rapi menggunakan elipsis (...) jika melebihi 22 karakter.
- **Gradasi Keaktifan**: Palet 7 tingkat warna hijau tua hingga teal muda merefleksikan volume rapat tiap OPD.

---

## 📄 7. Standar Desain Ekspor Dokumen Resmi

### 1. Format Cetak & PDF
- **Kertas**: A4 (210 × 297 mm), orientasi portrait.
- **Batas Margin**: Atas 2.5 cm, Kiri 3.0 cm, Kanan 2.0 cm, Bawah 2.0 cm.
- **Tipografi Dokumen**: Font Serif resmi (Times New Roman setara 12pt dengan spasi baris 1.15).
- **Format Cetak Browser**: CSS `@media print` secara otomatis menonaktifkan navigasi sidebar, topbar, tombol aksi, dan mengatur margin cetak 100% rapi.

### 2. Format Microsoft Word (.docx)
- Menghasilkan dokumen berekstensi `.docx` berstandar ECMA-376 OOXML murni.
- Gaya tabel dengan border tipis formal, perataan teks terdistribusi rata kiri-kanan (*justify*), penomoran bab otomatis, dan blok tanda tangan sejajar siap sunting.
