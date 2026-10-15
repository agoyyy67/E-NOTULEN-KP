# ==========================================================
# e-Notulen - Public Tunnel Runner (Cloudflare Tunnel)
# ==========================================================
# Script ini membuka port 3004 ke internet secara publik dan gratis.
# Anda bisa scan QR Code verifikasi langsung dari HP (bisa pakai paket data seluler).
# Tidak perlu setting Wi-Fi sama dan tidak perlu cek ipconfig!
# ==========================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   e-Notulen Pemkab Purbalingga - Public Cloudflare Tunnel" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Menghubungkan http://localhost:3004 ke internet publik..." -ForegroundColor Yellow
Write-Host "Tunggu beberapa detik sampai link HTTPS (trycloudflare.com) muncul..." -ForegroundColor Gray
Write-Host ""

npx -y cloudflared tunnel --url http://localhost:3004
