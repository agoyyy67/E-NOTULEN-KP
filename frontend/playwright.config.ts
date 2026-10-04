import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Arahkan lokasi browser ke Drive D: (menghindari limit penyimpanan Drive C:)
process.env.PLAYWRIGHT_BROWSERS_PATH =
  process.env.PLAYWRIGHT_BROWSERS_PATH || "D:\\ms-playwright";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Jalankan tes secara sekuensial agar tidak membebani kompilasi Next.js */
  fullyParallel: false,
  timeout: 60000,
  /* Gagal di CI jika Anda tidak sengaja meninggalkan test.only di kode sumber */
  forbidOnly: !!process.env.CI,
  /* Retry pada CI atau lokal saat gagal */
  retries: process.env.CI ? 2 : 0,
  /* Workers */
  workers: 1,
  /* Reporter yang digunakan: HTML report + list di konsol */
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  /* Konfigurasi bersama untuk semua project */
  use: {
    /* Base URL aplikasi Next.js */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    /* Rekam jejak (trace), screenshot, dan video untuk setiap pengujian */
    trace: "on",
    screenshot: "on",
    video: "on",
  },

  /* Konfigurasi browser / device */
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  /* Jalankan local dev server sebelum memulai test */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NEXT_PUBLIC_USE_MOCK: "true",
      PORT: "3000",
    },
  },
});
