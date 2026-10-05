import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifikasi Dokumen | e-Notulen Kabupaten Purbalingga",
  description:
    "Halaman penelusuran dan pengecekan keaslian dokumen notulen rapat resmi Pemerintah Kabupaten Purbalingga melalui QR Code.",
  robots: { index: false, follow: false },
};

export default function VerifikasiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
