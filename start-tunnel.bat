@echo off
title e-Notulen - Cloudflare Public Tunnel
echo ==========================================================
echo    e-Notulen Pemkab Purbalingga - Public Cloudflare Tunnel
echo ==========================================================
echo Menghubungkan http://localhost:3004 ke internet publik...
echo Tunggu beberapa detik sampai link HTTPS (trycloudflare.com) muncul...
echo.
npx -y cloudflared tunnel --url http://localhost:3004
pause
