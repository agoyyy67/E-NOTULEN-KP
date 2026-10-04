# ARCHITECTURE.md — Arsitektur Sistem & Spesifikasi Teknis e-Notulen

## 📐 1. High-Level Architecture

Arsitektur aplikasi **e-Notulen** dirancang menggunakan arsitektur monorepo terpisah (*decoupled monorepo*), mengintegrasikan antarmuka modern Next.js 15 (App Router) dengan backend API berperforma tinggi berbasis Go (Golang), serta terhubung ke infrastruktur Single Sign-On (SSO) dan API Kepegawaian Pemerintah Kabupaten Purbalingga.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  INFRASTRUKTUR SISTEM E-NOTULEN                                  │
│                                                                                                  │
│  ┌───────────────────────────┐                         ┌──────────────────────────────────────┐  │
│  │     Next.js Frontend      │                         │            Go Backend API            │  │
│  │     (Port 3000)           │                         │            (Port 8080)               │  │
│  │                           │                         │                                      │  │
│  │ • Next.js 15 (App Router) │───── REST API (HTTP) ──▶│ • Chi Router v5                      │  │
│  │ • React Server Components │      (Bearer JWT)       │ • Clean Architecture (Handler/       │  │
│  │ • Tailwind CSS            │                         │   Service/Repository)                │  │
│  │ • Tiptap Headless Editor  │                         │ • PostgreSQL Driver: pgxpool v5      │  │
│  │ • Recharts Data Viz       │◀──── JSON Responses ────│ • MinIO S3 SDK v7                    │  │
│  │ • Global Command Palette  │                         │ • Native PDF Generator (gofpdf)      │  │
│  │ • Public Absensi Card     │                         │ • Native Word Generator (OOXML DOCX) │  │
│  └─────────────┬─────────────┘                         └──────────────────┬───────────────────┘  │
│                │                                                          │                      │
│                │ (Akses Gambar, Logo, Berkas Fisik via Proxy)             │                      │
│                │ GET /api/v1/storage/*                                    │                      │
│                └──────────────────────────────────────────────────────────┤                      │
│                                                                           │                      │
│                                                     ┌─────────────────────┴────────────────────┐ │
│                                                     │                                          │ │
│                                                     ▼                                          ▼ │
│                                          ┌──────────────────────┐   ┌──────────────────────────┐ │
│                                          │  PostgreSQL Database │   │   MinIO Object Storage   │ │
│                                          │  (Port 5432)         │   │   (Internal S3)          │ │
│                                          │                      │   │                          │ │
│                                          │ • Transaksional Data │   │ • Foto Dokumentasi Rapat │ │
│                                          │ • TSVECTOR FTS Index │   │ • Berkas PDF Hasil Scan  │ │
│                                          │ • Snapshot Auto-Save │   │ • Logo Kop Surat Dinas   │ │
│                                          └──────────────────────┘   └──────────────────────────┘ │
└─────────────────────────────────────────────────────┬─────────────────────────────┬──────────────┘
                                                      │                             │
                                                      ▼                             ▼
                                 ┌──────────────────────────────┐ ┌──────────────────────────────┐
                                 │     Keycloak SSO Pemkab      │ │      API SKPD Eksternal      │
                                 │ accounts.purbalinggakab.go.id│ │ api.pegawai.e-kinerja...     │
                                 │ Realm: apps                  │ │ .purbalinggakab.go.id        │
                                 │ Validasi Token via JWKS Pub  │ │ Master Satuan Kerja (Cached) │
                                 └──────────────────────────────┘ └──────────────────────────────┘
```

> **Catatan Kunci Keamanan & Jaringan**: Pada iterasi terbaru ini, browser pengguna **tidak lagi** berkomunikasi langsung dengan port 9000 MinIO. Seluruh permintaan unduhan file, render logo kop surat dinas, penayangan foto dokumentasi, dan pengunggahan berkas fisik disalurkan melalui **Smart Storage Proxy** backend di `/api/v1/storage/*` dan `/upload-doc`. Pendekatan ini secara permanen mengeliminasi kendala CORS pada browser, kegagalan Mixed Content SSL, serta mencegah ekspos port internal ke internet publik.

---

## 🏛️ 2. Arsitektur Backend (Clean Architecture Pattern)

Backend dibangun menggunakan prinsip Clean Architecture dengan pemisahan dependensi satu arah yang tegas:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  HTTP LAYER                                  │
│  ┌──────────────────────┐  ┌───────────────────────┐  ┌───────────────────┐  │
│  │ Middlewares          │  │ Chi HTTP Router       │  │ HTTP Handlers     │  │
│  │ • Auth (Keycloak)    │  │ • Public Endpoints    │  │ • notulen_handler │  │
│  │ • CORS Whitelist     │  │ • Protected Groups    │  │ • opd_handler     │  │
│  │ • Structured Logger  │  │ • Role Authorizer     │  │ • report_handler  │  │
│  │ • Panic Recoverer    │  │ • Smart Storage Proxy │  │ • search_handler  │  │
│  └──────────┬───────────┘  └───────────┬───────────┘  └─────────┬─────────┘  │
└─────────────┼──────────────────────────┼────────────────────────┼────────────┘
              │                          │                        │
              ▼                          ▼                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                                SERVICE LAYER                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ NotulenService                                                         │  │
│  │ • Validasi otoritas RBAC (Super Admin, Operator OPD, Officer Notulis)  │  │
│  │ • Orkestrasi siklus notulen (Draft, Final, Duplikasi, Pemulihan)       │  │
│  │ • Kompilasi dokumen PDF resmi (pkg/pdf)                                │  │
│  │ • Kompilasi dokumen Word (.docx) native murni (pkg/word)               │  │
│  │ • Pengelolaan snapshot auto-save dengan debouncing                     │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ OPDService & ReportService                                             │  │
│  │ • Sinkronisasi dan pembaruan pengaturan kop surat dinas                │  │
│  │ • Agregasi statistik, penghitungan kehadiran, dan rekapitulasi pelaporan│
│  └───────────────────────────────────┬────────────────────────────────────┘  │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                               REPOSITORY LAYER                               │
│  ┌───────────────────┐  ┌──────────────────────┐  ┌───────────────────────┐  │
│  │ NotulenRepository │  │ AttendeeRepository   │  │ AttachmentRepository  │  │
│  │ • SQL via pgxpool │  │ • Batch Insert/Query │  │ • Metadata Lampiran   │  │
│  ├───────────────────┤  ├──────────────────────┤  ├───────────────────────┤  │
│  │ AutoSaveRepo      │  │ OPDRepository        │  │ Storage Engine (S3)   │  │
│  │ • Snapshot Limit  │  │ • In-Memory Caching  │  │ • Smart S3 Proxy      │  │
│  └─────────┬─────────┘  └──────────┬───────────┘  └───────────┬───────────┘  │
└────────────┼───────────────────────┼──────────────────────────┼──────────────┘
             │                       │                          │
             ▼                       ▼                          ▼
┌─────────────────────────┐ ┌───────────────────┐ ┌────────────────────────────┐
│   PostgreSQL Database   │ │ SKPD External API │ │ MinIO Object Storage (S3)  │
└─────────────────────────┘ └───────────────────┘ └────────────────────────────┘
```

### Tanggung Jawab Tiap Lapisan
- **Handler Layer (`internal/handler`)**: Membaca parameter URL/query, mendekode payload JSON/Multipart, menjalankan validasi skema dasar via `pkg/validator`, memanggil service, dan memformat respon HTTP melalui `pkg/response`.
- **Service Layer (`internal/service`)**: Pusat logika bisnis. Memeriksa apakah user memiliki hak atas OPD terkait, mengelola status dokumen, memanggil generator PDF/Word, dan memastikan konsistensi transaksional.
- **Repository Layer (`internal/repository`)**: Mengeksekusi query SQL mentah yang teroptimasi menggunakan driver native `pgx/v5`, mengelola cache in-memory untuk API SKPD, dan berinteraksi dengan S3 MinIO.
- **Shared Packages (`pkg/`)**: Pustaka mandiri tanpa dependensi domain:
  - `pkg/database`: Connection pool PostgreSQL dengan migrasi otomatis.
  - `pkg/keycloak`: Verifikasi token JWT via JWKS (JSON Web Key Set).
  - `pkg/storage`: Klien S3 dengan method `ServeObject` (Smart Storage Proxy).
  - `pkg/pdf`: Generator dokumen PDF kedinasan A4 menggunakan `gofpdf`.
  - `pkg/word`: Generator dokumen Microsoft Word (.docx) murni berbasis standar ECMA-376 OOXML.
  - `pkg/validator`: Wrapper validator struct menggunakan `go-playground/validator/v10`.
  - `pkg/response`: Helper format respon JSON terstandar.

---

## 🔐 3. Struktur Token JWT Keycloak SSO & Ekstraksi Hak Akses

Aplikasi memanfaatkan Keycloak SSO Pemerintah Kabupaten Purbalingga (`realm: apps`, `client_id: e-notulen`). Verifikasi token dilakukan secara lokal oleh Go backend menggunakan kunci publik yang di-cache dari endpoint JWKS SSO:

```go
type TokenClaims struct {
    Sub               string                 `json:"sub"`                // UUID Pengguna
    PreferredUsername string                 `json:"preferred_username"` // NIP ASN
    Name              string                 `json:"name"`               // Nama Lengkap Beserta Gelar
    Email             string                 `json:"email"`
    ResourceAccess    map[string]ResourceRole`json:"resource_access"`
    KodeUnit          string                 `json:"kode_unit"`          // Khusus Operator OPD
    OPDName           string                 `json:"opd_name"`
    Officer           *OfficerData           `json:"officer"`            // Khusus Pegawai / Officer
}

type ResourceRole struct {
    Roles []string `json:"roles"`
}

type OfficerData struct {
    NIP     string       `json:"nip"`
    Jabatan string       `json:"jabatan"`
    Unit    *OfficerUnit `json:"unit"`
}

type OfficerUnit struct {
    ID   string `json:"id"`
    Nama string `json:"nama"`
}
```

### Resolusi Hak Akses (RBAC Resolution Logic)
```go
func ResolveUserContext(claims *TokenClaims) (*UserContext, error) {
    roles := claims.ResourceAccess["e-notulen"].Roles
    if len(roles) == 0 {
        return nil, errors.New("pengguna tidak memiliki role pada aplikasi e-notulen")
    }

    userCtx := &UserContext{
        UserID:      claims.Sub,
        Username:    claims.PreferredUsername,
        DisplayName: claims.Name,
        Role:        roles[0], // 'admin' | 'operator' | 'officer'
    }

    switch userCtx.Role {
    case "admin":
        userCtx.OPDCode = "" // Super Admin bebas lintas seluruh OPD
        userCtx.OPDName = "Pemerintah Kabupaten Purbalingga"
    case "operator":
        userCtx.OPDCode = claims.KodeUnit
        userCtx.OPDName = claims.OPDName
    case "officer":
        if claims.Officer != nil {
            userCtx.NIP = claims.Officer.NIP
            userCtx.Jabatan = claims.Officer.Jabatan
            if claims.Officer.Unit != nil {
                userCtx.OPDCode = claims.Officer.Unit.ID
                userCtx.OPDName = claims.Officer.Unit.Nama
            }
        }
    }
    return userCtx, nil
}
```

---

## 🏢 4. Integrasi API Eksternal SKPD & In-Memory Caching

Daftar master seluruh Satuan Kerja Perangkat Daerah (SKPD/OPD) di Kabupaten Purbalingga diperoleh dari API resmi kepegawaian:
- **URL**: `https://api.pegawai.e-kinerja.purbalinggakab.go.id/v2/skpd/list?filter_pesona=true`
- **Strategi Caching**: Hasil query di-cache di memori Go selama **1 jam (TTL = 3600 detik)** menggunakan `sync.RWMutex`.
- **Fallback Toleran**: Apabila server API kepegawaian mengalami timeout atau downtime, repository secara otomatis menggunakan data cache terakhir atau daftar mock darurat sehingga sistem e-Notulen tetap beroperasi 100%.

---

## 🗄️ 5. Skema Lengkap Database PostgreSQL (DDL)

```sql
-- Ekstensi UUID Generator
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabel Konfigurasi Kop Surat Dinas per OPD
CREATE TABLE IF NOT EXISTS opd_settings (
    kode_unit           VARCHAR(20) PRIMARY KEY,
    opd_name            VARCHAR(255) NOT NULL,
    logo_url            VARCHAR(512),
    letterhead_config   JSONB NOT NULL DEFAULT '{}',
    address             TEXT,
    phone               VARCHAR(50),
    email               VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabel Utama Risalah Rapat (Notulen)
CREATE TABLE IF NOT EXISTS notulen (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(500) NOT NULL,
    meeting_date        DATE NOT NULL,
    start_time          TIME,
    end_time            TIME,
    location            VARCHAR(500),
    led_by              VARCHAR(255),            -- Nama Pemimpin Rapat Fisik
    led_by_position     VARCHAR(255),            -- Jabatan Pemimpin Rapat
    led_by_nip          VARCHAR(30),             -- NIP Pemimpin Rapat
    signed_by           VARCHAR(255),            -- Pejabat Penanda Tangan Dokumen
    signed_by_position  VARCHAR(255),            -- Jabatan Penanda Tangan
    signed_by_nip       VARCHAR(30),             -- NIP Penanda Tangan
    notulist_name       VARCHAR(255),            -- Nama Notulis / Pencatat
    notulist_position   VARCHAR(255),            -- Jabatan Notulis
    notulist_nip        VARCHAR(30),             -- NIP Notulis
    input_type          VARCHAR(20) NOT NULL DEFAULT 'editor'
                        CHECK (input_type IN ('editor', 'upload')),
    content             JSONB,                   -- Struktur Dokumen Tiptap
    file_url            VARCHAR(512),            -- Berkas PDF jika tipe input 'upload'
    file_name           VARCHAR(255),
    summary             TEXT,
    content_search      TSVECTOR GENERATED ALWAYS AS (
                          to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(summary, ''))
                        ) STORED,
    opd_code            VARCHAR(20) NOT NULL,
    opd_name            VARCHAR(255) NOT NULL,
    created_by_sub      UUID NOT NULL,           -- Sub Keycloak Pembuat
    created_by_name     VARCHAR(255) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'final')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ              -- Soft Delete Flag
);

-- Indeks Performa Tabel Notulen
CREATE INDEX IF NOT EXISTS idx_notulen_opd_code ON notulen(opd_code);
CREATE INDEX IF NOT EXISTS idx_notulen_created_by_sub ON notulen(created_by_sub);
CREATE INDEX IF NOT EXISTS idx_notulen_meeting_date ON notulen(meeting_date);
CREATE INDEX IF NOT EXISTS idx_notulen_status ON notulen(status);
CREATE INDEX IF NOT EXISTS idx_notulen_content_search ON notulen USING GIN(content_search);
CREATE INDEX IF NOT EXISTS idx_notulen_deleted_at ON notulen(deleted_at) WHERE deleted_at IS NULL;

-- 3. Tabel Peserta Rapat (Daftar Hadir)
CREATE TABLE IF NOT EXISTS notulen_attendees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notulen_id      UUID NOT NULL REFERENCES notulen(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    institution     VARCHAR(255),
    position        VARCHAR(255),
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notulen_attendees_notulen_id ON notulen_attendees(notulen_id);

-- 4. Tabel Lampiran Foto Dokumentasi Rapat
CREATE TABLE IF NOT EXISTS notulen_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notulen_id      UUID NOT NULL REFERENCES notulen(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_url        VARCHAR(512) NOT NULL,
    file_size       BIGINT NOT NULL DEFAULT 0,
    mime_type       VARCHAR(100) NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notulen_attachments_notulen_id ON notulen_attachments(notulen_id);

-- 5. Tabel Snapshot Riwayat Auto-Save
CREATE TABLE IF NOT EXISTS notulen_auto_saves (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notulen_id      UUID NOT NULL REFERENCES notulen(id) ON DELETE CASCADE,
    content         JSONB NOT NULL,
    saved_by_sub    UUID NOT NULL,
    saved_by_name   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notulen_auto_saves_notulen_id ON notulen_auto_saves(notulen_id);
```

---

## 🌐 6. Arsitektur Smart Storage Proxy (`pkg/storage/minio.go`)

Penyimpanan MinIO beroperasi di dalam jaringan internal container. Browser klien mengakses seluruh berkas melalui handler khusus `minioStorage.ServeObject(w, r, rawPath)`:

```
GET /api/v1/storage/documents/notulen_rapat_abc.pdf
                        │
                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Method ServeObject (pkg/storage/minio.go)                              │
│                                                                        │
│ 1. Normalisasi Path:                                                   │
│    rawPath = strings.TrimPrefix(rawPath, "/")                          │
│    unescaped, _ := url.PathUnescape(rawPath)                           │
│                                                                        │
│ 2. Pembentukan Kandidat Kunci (Candidate Keys):                        │
│    - rawPath asli (misal: "e-notulen/logos/logo_dinkominfo.png")       │
│    - unescaped path                                                    │
│    - Strip prefix "e-notulen/" dan "notulen/"                          │
│                                                                        │
│ 3. Multi-Bucket Direct Check:                                          │
│    Cari pada bucket: ["e-notulen", "notulen", cfg.BucketName]          │
│    Jika ditemukan dan Size > 0:                                        │
│      -> Tetapkan Content-Type sesuai ekstensi file                     │
│      -> Set Cache-Control: public, max-age=86400                      │
│      -> io.Copy(w, obj) dan Return                                     │
│                                                                        │
│ 4. Fallback Cerdas (Fuzzy Matcher):                                    │
│    Jika direct key miss:                                               │
│    - Scan recursive nama objek pada bucket                             │
│    - Bandingkan strings.EqualFold(objBase, baseName)                   │
│    - Bandingkan strings.HasSuffix(rawPath, obj.Key)                    │
│    - Jika cocok -> Stream file ke response HTTP                       │
│                                                                        │
│ 5. Jika seluruh opsi gagal:                                            │
│    - Kirim HTTP 404 "File not found"                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📑 7. Mesin Generator Dokumen: PDF & Microsoft Word (.docx)

### 1. Generator Dokumen PDF Resmi (`pkg/pdf/pdf_generator.go`)
- Menggunakan pustaka native Go `gofpdf` (tanpa Chromium, Puppeteer, atau wkhtmltopdf).
- Kompilasi dokumen formal A4:
  1. **Kepala Surat Resmi (Kop Dinas)**: Logo OPD di sisi kiri (diambil via internal proxy stream), nama pemerintah daerah, nama dinas berhuruf kapital tebal, alamat lengkap, dan garis ganda tebal-tipis.
  2. **Tabel Metadata**: Format 2 kolom tanpa garis batas luar (Hari/Tanggal, Waktu, Tempat, Pimpinan Rapat, Notulis).
  3. **Isi Pembahasan**: Tiptap parser mengubah JSON node (paragraf, bullet, ordered list) menjadi teks terformat rapi.
  4. **Tabel Daftar Hadir**: Kolom nomor urut, nama lengkap, instansi asal, dan jabatan dengan garis border naskah dinas.
  5. **Blok Tanda Tangan Ganda**: Pejabat Penanda Tangan di kiri/kanan dan Notulis di kanan lengkap dengan nama bergaris bawah dan NIP.
  6. **Galeri Dokumentasi Foto**: Halaman terpisah menyajikan foto kegiatan bergrid 2x2.

### 2. Generator Dokumen Microsoft Word Murni (`pkg/word/word_generator.go`)
- Menghasilkan berkas `.docx` valid sesuai standar ISO/IEC 29500 dan ECMA-376 OOXML.
- Disusun murni menggunakan Go standard library `archive/zip` tanpa ketergantungan pada LibreOffice runtime:
  - `[Content_Types].xml`: Memetakan MIME type file XML dokumen.
  - `_rels/.rels` & `word/_rels/document.xml.rels`: Relasi dokumen terhadap core properties dan styles.
  - `word/document.xml`: Badan dokumen lengkap dengan tabel ber-border kedinasan, format paragraf, dan tabel 2 kolom tanda tangan.
  - `word/styles.xml`: Definisi gaya font standar kedinasan (Times New Roman / Arial).
  - `docProps/core.xml`: Properti dokumen kedinasan.

---

## 🔌 8. Spesifikasi Endpoint REST API & Payload Skema

### Endpoint Publik (Tanpa Token)
- `GET /api/v1/health` & `GET /api/v1/health/db`
- `GET /api/v1/public/absensi/{id}`:
  ```json
  // Response 200 OK
  {
    "success": true,
    "data": {
      "id": "7f8a9b1c-...",
      "title": "Rapat Koordinasi Smart City",
      "meeting_date": "2026-03-24",
      "start_time": "09:00",
      "end_time": "12:00",
      "location": "Ruang Rapat Kadis Lt. 2",
      "opd_name": "Dinas Komunikasi dan Informatika"
    }
  }
  ```
- `POST /api/v1/public/absensi/{id}`:
  ```json
  // Request Payload
  {
    "name": "Dr. Hendro Prasetyo, M.Eng",
    "institution": "Badan Kepegawaian Pendidikan dan Pelatihan",
    "position": "Kepala Bidang Pembinaan ASN"
  }
  ```
- `GET /api/v1/storage/*`: Streaming berkas gambar/PDF dari MinIO.

### Endpoint Terproteksi (Bearer Token)
- `GET /api/v1/notulen`: Query notulen dengan filter `status`, `search`, `opd_code`, `date_from`, `date_to`, `page`, `limit`.
- `POST /api/v1/notulen`:
  ```json
  {
    "title": "Rapat Koordinasi Evaluasi SPBE Triwulan I",
    "meeting_date": "2026-03-24",
    "start_time": "09:00",
    "end_time": "12:00",
    "location": "Ruang Rapat Dinkominfo Lt. 2",
    "led_by": "Drs. Bambang Wijonarko, M.Si",
    "led_by_position": "Kepala Dinas Kominfo",
    "led_by_nip": "197103151996031002",
    "signed_by": "Drs. Bambang Wijonarko, M.Si",
    "signed_by_position": "Kepala Dinas Kominfo",
    "signed_by_nip": "197103151996031002",
    "notulist_name": "Budi Santoso, S.Kom",
    "notulist_position": "Pranata Komputer Ahli Muda",
    "notulist_nip": "198501012010011001",
    "input_type": "editor",
    "content": { "type": "doc", "content": [...] },
    "opd_code": "T8",
    "opd_name": "Dinas Komunikasi dan Informatika",
    "status": "draft",
    "attendees": [
      { "name": "Ir. Tri Gunawan", "institution": "Bappelitbangda", "position": "Kabid Litbang" }
    ]
  }
  ```
- `POST /api/v1/notulen/{id}/upload-doc`: Multipart file upload berkas PDF hasil scan fisik via backend proxy.
- `GET /api/v1/notulen/{id}/download` & `GET /api/v1/notulen/{id}/word`: Unduh berkas resmi hasil kompilasi.
- `POST /api/v1/notulen/{id}/duplicate`: Kloning record notulen menjadi draf baru.
- `POST /api/v1/notulen/{id}/restore`: Memulihkan notulen yang terhapus ke status aktif.

---

## 🛡️ 9. Aspek Keamanan & Ketahanan Sistem

1. **Prinsip Least Privilege**:
   - Super Admin (`admin`): Pengawasan global dan konfigurasi kop surat seluruh dinas.
   - Operator OPD (`operator`): Terkunci hanya pada `opd_code` instansinya.
   - Officer Pegawai (`officer`): Terkunci hanya pada notulen dengan `created_by_sub` miliknya.
2. **Perlindungan Injeksi SQL**:
   - Seluruh interaksi database menggunakan prepared statements berparameter melalui `pgxpool`.
3. **Penyimpanan Token Aman**:
   - Token JWT disimpan pada HttpOnly Secure Cookie dengan atribut `SameSite=Lax` untuk mencegah pencurian token via serangan XSS.
4. **Isolasi Penyimpanan Object**:
   - Kredensial root MinIO dan port internal storage terisolasi di dalam Docker network tanpa port forwarding publik ke host.
