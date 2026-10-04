# 📝 e-Notulen — Sistem Manajemen Notulen Digital

![Go Version](https://img.shields.io/badge/Go-1.22.x-00ADD8?style=flat&logo=go)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-4169E1?style=flat&logo=postgresql)
![MinIO](https://img.shields.io/badge/MinIO-Object%20Storage-C72C48?style=flat&logo=minio)
![Keycloak](https://img.shields.io/badge/Keycloak-SSO%20OIDC-4D4D4D?style=flat&logo=redhat)
![Clean Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture-brightgreen)

**e-Notulen** adalah platform sistem manajemen notulen digital resmi yang dirancang khusus untuk **Pemerintah Kabupaten Purbalingga**. Platform ini mentransformasi proses pencatatan, penyusunan, pengarsipan, hingga pembuatan dokumen laporan PDF notulen rapat secara terstruktur, cepat, dan terintegrasi antar OPD (Organisasi Perangkat Daerah).

---

## 🌟 Fitur Utama

- 🔐 **Autentikasi Terpusat Keycloak (SSO Pemkab)**: Terintegrasi penuh dengan Single Sign-On (SSO) Pemerintah Kabupaten Purbalingga menggunakan standar OpenID Connect (OIDC) dan OAuth 2.0.
- 👥 **Role-Based Access Control (RBAC)**:
  - **Super Admin**: Pengelolaan seluruh notulen dan konfigurasi OPD se-Kabupaten Purbalingga.
  - **Operator OPD**: Pengelolaan dan pencarian notulen internal pada OPD/kantor masing-masing.
  - **Officer (Pegawai)**: Pengelolaan notulen pribadi yang dibuat oleh pegawai bersangkutan.
- 🔍 **Pencarian Teks Lengkap (Full-Text Search)**: Didukung indeks PostgreSQL `tsvector` GIN untuk pencarian instan pada judul, narasi, ringkasan, dan isi notulen.
- 📁 **Penyimpanan Berkas MinIO (S3 Compatible)**: Manajemen penyimpanan lampiran dokumen rapat dan berkas eksternal dengan *Presigned URL Security*.
- 🏢 **Integrasi API SKPD e-Kinerja**: Pengambilan otomatis daftar resmi OPD/SKPD se-Kabupaten Purbalingga dari API e-Kinerja dengan mekanisme *In-Memory Caching* (TTL 1 jam).
- 📄 **Generator Laporan PDF Resmi**: Pembuatan otomatis berkas PDF notulen rapat lengkap dengan Kop Surat resmi OPD.
- 💾 **Auto-Save & Riwayat Draf**: Perlindungan data notulen dengan simpan otomatis (*debounce*) untuk mencegah kehilangan narasi saat pengisian.

---

## 🏗️ Arsitektur & Teknologi

Backend dibangun menggunakan bahasa **Go (Golang)** mengikuti prinsip **Clean Architecture** yang memisahkan tanggung jawab kode ke dalam lapisan independen (*Handler → Service → Repository → Model/Entity*).

### Tech Stack:
- **Backend Core**: Go v1.22.x
- **HTTP Router**: `go-chi/chi/v5`
- **Database**: PostgreSQL 16 (Driver `jackc/pgx/v5` dengan Connection Pooling)
- **Object Storage**: MinIO (`minio-go/v7`)
- **Autentikasi**: Keycloak JWKS RS256 (`golang-jwt/jwt/v5`)
- **PDF Engine**: `junegunn/gofpdf`
- **Containerization**: Docker & Docker Compose

---

## 📁 Struktur Proyek

```text
E-NOTULEN-testing/
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go               # Entrypoint aplikasi Backend
│   ├── internal/
│   │   ├── config/                   # Configuration Loader
│   │   ├── handler/                  # HTTP Delivery / Controller Layer
│   │   ├── middleware/               # Auth (Keycloak JWKS), CORS, & Logger
│   │   ├── model/                    # Struct Models, DTOs, & User Context
│   │   ├── repository/               # Data Access Layer (SQL Query & API Proxy)
│   │   └── service/                  # Business Logic & PDF Generator
│   ├── migrations/                   # Script SQL Migration UP/DOWN
│   ├── pkg/                          # Reusable packages (Database, Storage, Keycloak)
│   └── go.mod                        # Go Module Dependencies
├── docker/                           # Dockerfiles untuk Backend & Frontend
├── docs/                             # Dokumentasi Teknis & Keycloak Config
├── docker-compose.dev.yml            # Docker Compose Lingkungan Development
├── ARCHITECTURE.md                   # Dokumentasi Arsitektur Sistem
├── FEATURES.md                       # Daftar Spesifikasi Fitur Detail
└── CLAUDE.md                         # Panduan Konvensi Pengembangan
```

---

## 🚀 Panduan Memulai (Getting Started)

### 📋 Prasyarat Sistem
- **Go**: Version `1.22.x` atau lebih baru
- **Docker & Docker Desktop**: Terinstal dan berjalan
- **Git Bash / Terminal**

---

### 1. Cloning & Setup Environment

Copy file `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

Pastikan variabel utama pada file `.env` sudah sesuai:
```ini
APP_ENV=development
APP_PORT=8088
DATABASE_URL=postgres://enotulen:enotulen_dev@localhost:5432/enotulen?sslmode=disable
KEYCLOAK_ISSUER_URL=https://accounts.purbalinggakab.go.id/auth/realms/apps
MINIO_ENDPOINT=localhost:9000
```

---

### 2. Jalankan Infrastruktur (Docker Compose)

Jalankan container PostgreSQL dan MinIO Storage:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Periksa status container hingga `healthy`:
```bash
docker compose -f docker-compose.dev.yml ps
```

---

### 3. Migrasi Database

Jalankan skrip migrasi SQL pada database PostgreSQL:
- Skrip migrasi terletak di: `backend/migrations/000001_init_schema.up.sql`

---

### 4. Menjalankan Server Backend Go

Masuk ke direktori `backend` dan jalankan aplikasi:

```bash
cd backend
go run cmd/server/main.go
```

Server backend akan berjalan di **`http://localhost:8088`**.

---

## 🛠️ Ringkasan API Endpoints

### 🟢 Public Endpoints
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/v1/health` | Status kesehatan service Backend |
| `GET` | `/api/v1/health/db` | Status koneksi database PostgreSQL |

### 🔒 Authenticated Endpoints (Butuh Authorization Bearer Header)
| Method | Endpoint | Role Access | Deskripsi |
|---|---|---|---|
| `GET` | `/api/v1/auth/me` | All Roles | Mengambil profil & role user aktif |
| `GET` | `/api/v1/opd` | All Roles | Proxy daftar OPD dari API e-Kinerja |
| `GET` | `/api/v1/opd/{kodeUnit}/settings` | Admin, Operator | Mengambil setting Kop Surat OPD |
| `PUT` | `/api/v1/opd/{kodeUnit}/settings` | Admin, Operator | Memperbarui setting Kop Surat OPD |
| `GET` | `/api/v1/notulen` | All Roles (Scoped) | Mengambil daftar notulen dengan filter |
| `POST` | `/api/v1/notulen` | All Roles | Membuat notulen rapat baru |
| `GET` | `/api/v1/notulen/{id}` | All Roles (Scoped) | Detail notulen rapat berdasarkan ID |
| `PUT` | `/api/v1/notulen/{id}` | All Roles (Scoped) | Memperbarui isi notulen |
| `DELETE` | `/api/v1/notulen/{id}` | All Roles (Scoped) | Soft delete notulen |
| `PATCH` | `/api/v1/notulen/{id}/status` | All Roles (Scoped) | Memperbarui status (`draft` / `final`) |
| `POST` | `/api/v1/notulen/{id}/auto-save` | All Roles (Scoped) | Menyimpan draf narasi notulen |
| `GET` | `/api/v1/notulen/{id}/pdf` | All Roles (Scoped) | Mengunduh berkas laporan PDF resmi |
| `GET` | `/api/v1/dashboard` | All Roles (Scoped) | Ringkasan statistik dashboard |

---

## 👥 Pengujian Role (Auth Testing)

Login ke Keycloak Pemkab Purbalingga:
```text
https://accounts.purbalinggakab.go.id/auth/realms/apps/protocol/openid-connect/auth?client_id=e-notulen&redirect_uri=http://localhost:3000/auth/callback&response_type=code&scope=openid+profile+email
```

### Kredensial Pengujian:
1. **Super Admin**: Username `e-notulen` / Password `12345678`
2. **Operator OPD**: Username `dinporapar` / Password `12345678`
3. **Officer (Pegawai)**: Username `197303042007012013` / Password `12345678`

---

## 📄 Lisensi & Hak Cipta

Hak Cipta © 2026 **Pemerintah Kabupaten Purbalingga**. Seluruh hak cipta dilindungi undang-undang.
