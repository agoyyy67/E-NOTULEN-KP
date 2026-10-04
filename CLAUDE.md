# CLAUDE.md — Panduan Utama Pengembang & Agen AI e-Notulen

## 🎯 1. Tentang Proyek

**e-Notulen** adalah sistem informasi manajemen risalah rapat digital terintegrasi untuk Pemerintah Kabupaten Purbalingga. Aplikasi ini mendigitalisasi siklus pencatatan, penandatanganan, dokumentasi kegiatan, dan pelaporan rapat dinas se-kabupaten dengan mematuhi tata naskah dinas resmi pemerintah daerah.

---

## 🏗️ 2. Tech Stack & Dependensi Utama

| Layer | Teknologi | Versi / Keterangan |
| ----- | --------- | ------------------ |
| **Frontend** | Next.js | 15.x (App Router, React Server Components & Client Components) |
| **Styling** | Tailwind CSS | v3.x dengan kustomisasi CSS variables design tokens |
| **Rich Text Editor** | Tiptap (Headless) | StarterKit, Table, Underline, Highlight, Placeholder, TaskList |
| **Ikon** | Lucide React | Library ikon tunggal terstandar |
| **Visualisasi Data** | Recharts | Visualisasi analitik `MonthlyTrendChart` & `OpdRankChart` |
| **Backend** | Go (Golang) | 1.22+ (Clean Architecture: Handler, Service, Repository) |
| **HTTP Router** | Chi Router | v5 (`github.com/go-chi/chi/v5`) |
| **Database Driver** | pgx / pgxpool | v5 (`github.com/jackc/pgx/v5`) Native PostgreSQL driver |
| **Database** | PostgreSQL | 16 (Relational + FTS GIN Index TSVECTOR) |
| **Object Storage** | MinIO | S3-Compatible Storage via `github.com/minio/minio-go/v7` |
| **PDF Engine** | gofpdf | Kompilasi PDF resmi A4 native Go |
| **Word Engine** | Native OOXML (ECMA-376) | Kompilasi file `.docx` murni via Go standard library `archive/zip` |
| **Autentikasi** | Keycloak SSO | OIDC Authorization Code Flow, Realm `apps`, Client `e-notulen` |
| **Kontainerisasi** | Docker & Docker Compose | Multi-stage build development & production |

---

## 📁 3. Struktur Monorepo Aktual

```
e-notulen/
├── frontend/                              # Next.js 15 Web Application
│   ├── src/
│   │   ├── app/                           # App Router Routes
│   │   │   ├── (auth)/login/              # Halaman login resmi Pemkab Purbalingga
│   │   │   ├── (main)/                    # Area Terproteksi Sesi
│   │   │   │   ├── dashboard/             # Metrik ringkasan & grafik Recharts
│   │   │   │   ├── notulen/               # Manajemen Notulen Rapat
│   │   │   │   │   ├── [id]/              # Detail resmi, ekspor PDF/Word, duplikasi
│   │   │   │   │   │   └── edit/          # Editor naskah dinas, Tiptap, QR absensi
│   │   │   │   │   └── create/            # Formulir pembuatan risalah baru
│   │   │   │   ├── reports/               # Rekapitulasi laporan rapat & ekspor CSV
│   │   │   │   │   ├── activities/        # Riwayat aktivitas kegiatan
│   │   │   │   │   ├── monthly/           # Rekapitulasi bulanan
│   │   │   │   │   └── opd/               # Rekapitulasi per OPD
│   │   │   │   └── settings/opd/          # Konfigurasi kop dinas & live preview
│   │   │   ├── absensi/[id]/              # FORM PUBLIK: Absensi mandiri via QR Code
│   │   │   ├── layout.tsx                 # Root Layout & Command Palette Provider
│   │   │   └── page.tsx                   # Auto-redirector ke dashboard / login
│   │   ├── components/                    # Reusable UI Components
│   │   │   ├── common/                    # CommandPalette (Ctrl + K)
│   │   │   ├── dashboard/                 # OpdRankChart, MonthlyTrendChart
│   │   │   ├── layout/                    # Sidebar, Navbar, Breadcrumb
│   │   │   ├── notulen/                   # NotulenForm, TiptapEditor, AutoSaveBadge,
│   │   │   │                              # AttendeeTable, AttachmentManager, SignatureSection
│   │   │   └── ui/                        # Button, Modal, Card, Input, Combobox, Badge, Toast
│   │   ├── hooks/                         # useAuth, useToast, useAutoSave
│   │   ├── lib/                           # actions, api/client, auth, data, utils
│   │   └── types/                         # notulen, auth, api
│   ├── public/                            # Logo Pemkab Purbalingga & aset statis
│   ├── package.json
│   └── tailwind.config.ts
├── backend/                               # Go REST API Server
│   ├── cmd/server/main.go                 # Entry point server & konfigurasi router Chi
│   ├── internal/
│   │   ├── config/                        # Environment & config parser
│   │   ├── handler/                       # HTTP Handlers (notulen, opd, report, auth, search)
│   │   ├── middleware/                    # Auth Keycloak JWT, CORS, Logger, Recoverer
│   │   ├── model/                         # Domain struct, request/response DTO
│   │   ├── repository/                    # Database queries (pgx), caching, external API
│   │   └── service/                       # Business logic, RBAC checks, orchestrator
│   ├── pkg/                               # Standalone Reusable Packages
│   │   ├── database/                      # Connection pool PostgreSQL & auto migrations
│   │   ├── keycloak/                      # JWKS cache & JWT verification
│   │   ├── pdf/                           # PDF generator engine (gofpdf)
│   │   ├── word/                          # Native Go OOXML DOCX generator
│   │   ├── storage/                       # Smart MinIO Storage Proxy (ServeObject)
│   │   ├── response/                      # JSON response formatters
│   │   └── validator/                     # Request payload validation
│   ├── migrations/                        # SQL UP/DOWN schema migrations
│   ├── go.mod
│   └── go.sum
├── docker/                                # Dockerfiles
│   ├── frontend.Dockerfile
│   └── backend.Dockerfile
├── docker-compose.yml                     # Production compose
├── docker-compose.dev.yml                 # Development compose
├── FEATURES.md                            # Spesifikasi lengkap 50 fitur
├── APP_FLOW.md                            # Diagram alur & wireframe interaksi
├── ARCHITECTURE.md                        # Arsitektur sistem & skema database
├── DESIGN.md                              # Design tokens & panduan UI/UX
├── CLAUDE.md                              # Panduan pengembang & agen AI ini
└── README.md                              # Ringkasan proyek & instalasi cepat
```

---

## ⚠️ 4. Aturan Wajib Pengembangan (Golden Rules)

### 1. Smart Storage Proxy — Dilarang Direct Port 9000
- **JANGAN PERNAH** memanggil URL MinIO direct port (`:9000` / `:9001`) dari kode browser Next.js.
- **SELALU GUNAKAN** fungsi pembantu `getPublicImageUrl(path)` atau `getFileUrl(path)` di frontend yang mengarahkan trafik ke Backend Proxy `/api/v1/storage/*`.
- Pengunggahan berkas scan PDF fisik dilakukan via proxy backend di `/api/v1/notulen/{id}/upload-doc`.

### 2. Form Absensi Publik Bebas Autentikasi
- Halaman `/absensi/[id]` dan endpoint backend `GET /api/v1/public/absensi/{id}` serta `POST /api/v1/public/absensi/{id}` bersifat **bebas akses (tanpa token)** agar tamu rapat fisik dapat mencatat kehadiran instan lewat pemindaian QR Code tanpa perlu login SSO.

### 3. Pemisahan Pejabat Penanda Tangan Dokumen
- Dalam tata naskah dinas resmi, **Pemimpin Rapat di Lapangan** (`led_by`) tidak selalu sama dengan **Pejabat Penanda Tangan Risalah** (`signed_by`).
- Seluruh formulir, komponen `SignatureSection`, generator PDF, dan generator Word wajib mendukung fleksibilitas pemisahan nama, jabatan, dan NIP kedua pihak tersebut.

### 4. Generator Word Murni (Pure Go)
- File `pkg/word/word_generator.go` wajib dipertahankan murni (*pure Go*) tanpa memperkenalkan dependensi biner pihak ketiga seperti LibreOffice, pandoc, atau Node.js worker. Generator ini merakit file ZIP OOXML ECMA-376 secara langsung.

### 5. Pengujian Multi-Role Lokal via DevRoleSwitcher
- Saat menguji fitur Super Admin, Operator OPD, atau Officer Notulis di lingkungan development, manfaatkan komponen `DevRoleSwitcher` yang tersedia di sudut layar tanpa perlu memanipulasi token Keycloak SSO server produksi.

### 6. Canvas Editor & Click-to-Focus
- Kanvas Tiptap harus selalu mempertahankan perilaku *click-to-focus* di seluruh bidang lembar kertas putih agar pengguna merasa seperti mengetik di atas kertas dokumen A4 fisik.

---

## 🔌 5. Peta Lengkap Rute Backend API

```go
// Public Routes (Tanpa Bearer Token)
r.Get("/api/v1/health", healthHandler.Health)
r.Get("/api/v1/health/db", healthHandler.HealthDB)
r.Get("/api/v1/public/absensi/{id}", notulenHandler.GetPublicInfo)
r.Post("/api/v1/public/absensi/{id}", notulenHandler.SubmitAttendance)
r.Get("/api/v1/public/opd", opdHandler.ListSKPD)
r.Get("/api/v1/storage/*", storageHandlerFunc)

// Authenticated Routes (Wajib Header Authorization: Bearer <JWT>)
r.Get("/api/v1/auth/me", authHandler.Me)
r.Get("/api/v1/opd", opdHandler.ListSKPD)
r.Get("/api/v1/opd/{kodeUnit}/settings", opdHandler.GetSettings)
r.Put("/api/v1/opd/{kodeUnit}/settings", opdHandler.UpdateSettings)
r.Post("/api/v1/opd/{kodeUnit}/logo", opdHandler.UploadLogo)

r.Get("/api/v1/notulen", notulenHandler.List)
r.Post("/api/v1/notulen", notulenHandler.Create)
r.Get("/api/v1/notulen/{id}", notulenHandler.GetByID)
r.Put("/api/v1/notulen/{id}", notulenHandler.Update)
r.Patch("/api/v1/notulen/{id}", notulenHandler.Update)
r.Delete("/api/v1/notulen/{id}", notulenHandler.Delete)
r.Patch("/api/v1/notulen/{id}/status", notulenHandler.UpdateStatus)
r.Post("/api/v1/notulen/{id}/restore", notulenHandler.Restore)
r.Post("/api/v1/notulen/{id}/duplicate", notulenHandler.Duplicate)

r.Post("/api/v1/notulen/{id}/auto-save", notulenHandler.AutoSave)
r.Get("/api/v1/notulen/{id}/auto-saves", notulenHandler.GetAutoSaveHistory)

r.Get("/api/v1/notulen/{id}/download", notulenHandler.DownloadPDF)
r.Get("/api/v1/notulen/{id}/word", notulenHandler.DownloadWord)
r.Post("/api/v1/notulen/{id}/upload-doc", notulenHandler.UploadDocument)

r.Post("/api/v1/notulen/{id}/attachments", notulenHandler.UploadAttachment)
r.Delete("/api/v1/notulen/{id}/attachments/{attId}", notulenHandler.DeleteAttachment)

r.Get("/api/v1/search", searchHandler.Search)
r.Get("/api/v1/reports/summary", reportHandler.Summary)
r.Get("/api/v1/reports/activities", reportHandler.Activities)
```

---

## 🛠️ 6. Cheatsheet Perintah Pengoperasian

### Menjalankan Backend (Go)
```bash
cd backend
# Menjalankan server lokal (port 8080)
go run cmd/server/main.go

# Memeriksa dan merapikan dependensi
go mod tidy

# Menjalankan unit tests backend
go test -v ./...
```

### Menjalankan Frontend (Next.js)
```bash
cd frontend
# Menginstal dependensi
npm install

# Menjalankan dev server (port 3000)
npm run dev

# Memeriksa linting kode
npm run lint

# Build production bundle
npm run build
```

### Docker Compose
```bash
# Menjalankan seluruh stack development (PostgreSQL, MinIO, Backend, Frontend)
docker compose -f docker-compose.dev.yml up -d

# Meninjau log aktivitas backend secara live
docker compose -f docker-compose.dev.yml logs -f backend

# Menghentikan kontainer
docker compose -f docker-compose.dev.yml down
```
