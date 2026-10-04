import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "e-Notulen — Pemerintah Kabupaten Purbalingga",
    template: "%s | e-Notulen Purbalingga",
  },
  description:
    "Sistem manajemen notulen rapat digital untuk seluruh OPD Pemerintah Kabupaten Purbalingga. Buat, susun, dan arsipkan notulen rapat secara efisien.",
  keywords: ["notulen", "rapat", "Purbalingga", "OPD", "Pemkab", "digitalisasi"],
  authors: [{ name: "Pemerintah Kabupaten Purbalingga" }],
  robots: "noindex, nofollow", // internal government app
  icons: {
    icon: [
      { url: "/logo-purbalingga-official.png", type: "image/png" },
    ],
    shortcut: "/logo-purbalingga-official.png",
    apple: "/logo-purbalingga-official.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
