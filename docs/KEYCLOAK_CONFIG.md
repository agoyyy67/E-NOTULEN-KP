# e-Notulen — Keycloak Client Configuration
# ============================================
# Dokumen ini berisi panduan konfigurasi client e-Notulen
# di Keycloak realm "apps" yang sudah existing.
#
# Keycloak URL: https://accounts.purbalinggakab.go.id/auth
# Realm: apps
# ============================================

## 1. Buat Client di Keycloak Admin Console

### Akses Admin Console
```
URL: https://accounts.purbalinggakab.go.id/auth/admin/master/console
```

### Navigasi ke Realm "apps" → Clients → Create Client

### Client Settings
```
Client ID       : e-notulen
Client Protocol : openid-connect
Access Type      : confidential
```

### Settings Tab
```
Enabled                    : ON
Client Authentication      : ON
Standard Flow Enabled      : ON (Authorization Code Flow)
Direct Access Grants       : OFF
Implicit Flow              : OFF
Service Accounts Enabled   : OFF

Root URL                   : https://e-notulen.purbalinggakab.go.id
Home URL                   : https://e-notulen.purbalinggakab.go.id
Valid Redirect URIs        :
  - https://e-notulen.purbalinggakab.go.id/*
  - http://localhost:3000/*     (development)

Valid Post Logout Redirect URIs :
  - https://e-notulen.purbalinggakab.go.id
  - http://localhost:3000       (development)

Web Origins                :
  - https://e-notulen.purbalinggakab.go.id
  - http://localhost:3000       (development)
  - + (untuk CORS dari semua allowed origins)
```

### Credentials Tab
```
Client Authenticator : Client Id and Secret
Secret               : (auto-generated, copy ke .env KEYCLOAK_CLIENT_SECRET)
```

---

## 2. Buat Client Roles

### Navigasi ke: Clients → e-notulen → Roles Tab → Create Role

Buat 3 roles:
```
1. admin     - Super Admin, akses semua OPD dan fitur
2. operator  - Operator OPD, akses notulen OPD sendiri
3. officer   - Pegawai, akses notulen sendiri saja
```

---

## 3. Assign Roles ke Users

### Untuk Super Admin
```
User: e-notulen (atau user admin lain)
Navigasi: Users → Select User → Role Mappings
Client Roles → e-notulen → Assign "admin"
```

### Untuk Operator (per OPD)
```
User: dinkominfo (atau user OPD lain)
Navigasi: Users → Select User → Role Mappings
Client Roles → e-notulen → Assign "operator"

User Attributes:
  - kode_unit: T8  (harus sesuai dengan kode dari API SKPD)
```

### Untuk Officer (Pegawai)
```
User: 199807312022031005 (NIP sebagai username)
Navigasi: Users → Select User → Role Mappings
Client Roles → e-notulen → Assign "officer"

User Attributes:
  - Data officer otomatis terisi dari sistem kepegawaian
```

---

## 4. Protocol Mappers (Penting!)

### Pastikan mapper berikut aktif di Client → e-notulen → Client Scopes → Mappers:

### Mapper: kode_unit
```
Name              : kode_unit
Mapper Type       : User Attribute
User Attribute    : kode_unit
Token Claim Name  : kode_unit
Claim JSON Type   : String
Add to ID token   : ON
Add to access token: ON
```

### Mapper: officer
```
Name              : officer
Mapper Type       : User Attribute (atau Script Mapper)
User Attribute    : officer
Token Claim Name  : officer
Claim JSON Type   : JSON
Add to ID token   : ON
Add to access token: ON
```

> **Note**: Mapper `officer` dan `kode_unit` kemungkinan sudah dikonfigurasi di realm scope karena dipakai oleh banyak aplikasi Pemkab. Verifikasi dengan mengecek decoded JWT token.

---

## 5. Endpoints yang Digunakan Aplikasi

| Endpoint | URL |
| -------- | --- |
| Authorization | `https://accounts.purbalinggakab.go.id/auth/realms/apps/protocol/openid-connect/auth` |
| Token | `https://accounts.purbalinggakab.go.id/auth/realms/apps/protocol/openid-connect/token` |
| JWKS | `https://accounts.purbalinggakab.go.id/auth/realms/apps/protocol/openid-connect/certs` |
| UserInfo | `https://accounts.purbalinggakab.go.id/auth/realms/apps/protocol/openid-connect/userinfo` |
| Logout | `https://accounts.purbalinggakab.go.id/auth/realms/apps/protocol/openid-connect/logout` |
| Well-Known | `https://accounts.purbalinggakab.go.id/auth/realms/apps/.well-known/openid-configuration` |

---

## 6. Token Lifetime (Recommended)

```
Access Token Lifespan    : 5 minutes  (short, refresh frequently)
Refresh Token Lifespan   : 30 minutes (or match session timeout)
SSO Session Idle         : 30 minutes
SSO Session Max          : 10 hours
```

---

## 7. Testing Login Flow

### Dengan curl:
```bash
# 1. Get Authorization URL (open in browser)
echo "https://accounts.purbalinggakab.go.id/auth/realms/apps/protocol/openid-connect/auth?client_id=e-notulen&redirect_uri=http://localhost:3000/auth/callback&response_type=code&scope=openid+profile+email"

# 2. After login, exchange code for token
curl -X POST \
  https://accounts.purbalinggakab.go.id/auth/realms/apps/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=e-notulen" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000/auth/callback" \
  -d "code=AUTH_CODE_FROM_CALLBACK"

# 3. Decode JWT token (paste at jwt.io)
```
