# e-Notulen — MinIO Configuration
# ============================================
# Panduan setup MinIO untuk e-Notulen
# ============================================

## 1. Development Setup

MinIO sudah termasuk di `docker-compose.dev.yml`. Jalankan:

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Akses MinIO Console
```
URL      : http://localhost:9001
Username : minioadmin
Password : minioadmin
```

### Bucket otomatis dibuat oleh container `minio-setup`:
- Bucket: `e-notulen`

---

## 2. Bucket Structure

```
e-notulen/                          ← Bucket name
├── opd/
│   └── {kode_unit}/                ← e.g., "T8", "02"
│       └── logo/
│           └── logo.png            ← Logo OPD untuk kop surat PDF
│
├── notulen/
│   └── {notulen_uuid}/
│       ├── document/
│       │   └── {uuid}_notulen_rapat.pdf   ← File asli notulen (jika input_type='upload')
│       └── attachments/
│           ├── {uuid}_foto-1.jpg          ← Foto dokumentasi
│           ├── {uuid}_foto-2.jpg
│           └── {uuid}_foto-3.png
│
└── exports/
    └── {timestamp}/
        └── report.xlsx                    ← Temporary export files (auto-cleanup 24h)
```

---

## 3. Bucket Policy

### Default Policy
Bucket `e-notulen` bersifat **private**. Semua akses file melalui **presigned URLs** yang digenerate oleh backend.

### Presigned URL Configuration
```
Upload  : Presigned PUT URL, expire 15 menit
Download: Presigned GET URL, expire 1 jam
```

---

## 4. File Naming Convention

### Logo OPD
```
Path: opd/{kode_unit}/logo/logo.{ext}
Example: opd/T8/logo/logo.png
```

### File Asli Notulen (Upload)
```
Path: notulen/{notulen_id}/document/{uuid}_{original_filename}
Example: notulen/550e8400-e29b-41d4-a716-446655440000/document/b2c3d4e5_Notulen_Rapat_Maret.pdf
```

### Foto Dokumentasi Notulen
```
Path: notulen/{notulen_id}/attachments/{uuid}_{original_filename}
Example: notulen/550e8400-e29b-41d4-a716-446655440000/attachments/a1b2c3d4_foto-rapat.jpg
```

### Export Files (Temporary)
```
Path: exports/{timestamp}/{filename}
Example: exports/20250313_120000/rekap-notulen-maret-2025.xlsx
```

---

## 5. Upload Constraints

| Constraint        | Value                          |
| ----------------- | ------------------------------ |
| Max file size     | 10 MB per file                 |
| Allowed types     | `image/jpeg`, `image/png`, `image/webp` |
| Max per notulen   | 20 files                       |
| Logo max size     | 2 MB                           |
| Logo types        | `image/png`, `image/jpeg`      |

---

## 6. Image Processing

Backend harus process image saat upload:

```
1. Validate mime type (check magic bytes, not just extension)
2. Resize if width > 1920px (maintain aspect ratio)
3. Compress JPEG quality to 85%
4. Strip EXIF metadata (privacy)
5. Generate thumbnail (300px width) — optional, for gallery view
```

---

## 7. Production Configuration

### MinIO Environment Variables
```bash
MINIO_ROOT_USER=your_secure_username
MINIO_ROOT_PASSWORD=your_very_secure_password_min_16_chars
```

### Recommended Production Settings
```
# Di docker-compose.yml, tambahkan:
MINIO_STORAGE_CLASS_STANDARD=EC:0    # Untuk single node
MINIO_BROWSER=on                      # Aktifkan console
```

### Backup Strategy
```bash
# Backup MinIO data
mc mirror myminio/e-notulen /backup/minio/e-notulen

# Atau menggunakan volume backup
docker run --rm -v minio-data:/data -v /backup:/backup \
  alpine tar czf /backup/minio-backup-$(date +%Y%m%d).tar.gz /data
```

---

## 8. SDK Configuration (Go Backend)

```go
import "github.com/minio/minio-go/v7"

client, err := minio.New(endpoint, &minio.Options{
    Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
    Secure: useSSL,
    Region: "us-east-1",
})

// Ensure bucket exists
exists, _ := client.BucketExists(ctx, bucketName)
if !exists {
    client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{
        Region: "us-east-1",
    })
}
```
