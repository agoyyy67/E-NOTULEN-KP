import { NextRequest, NextResponse } from "next/server";
import { mockNotulen } from "@/lib/data/notulen";

/**
 * Public Document Verification Proxy
 *
 * GET /api/v1/public/verifikasi/[id]
 *
 * Endpoint publik (bebas autentikasi Keycloak) yang dipanggil oleh halaman
 * /verifikasi/[id] ketika seseorang memindai QR Code penelusuran dokumen.
 *
 * - Mode Mock : membaca data dari mock store (NEXT_PUBLIC_USE_MOCK=true)
 * - Mode Live : mem-proxy request ke backend Go
 *               GET {BACKEND}/api/v1/public/notulen/{id}/verify
 */

const APP_PORT = process.env.APP_PORT || "8088";
const BACKEND_URL = `http://enotulen-backend:${APP_PORT}/api/v1`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── Mode Mock (pengembangan tanpa backend) ──────────────────
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      const n = mockNotulen[id];
      if (!n) {
        return NextResponse.json(
          { success: false, message: "Dokumen tidak ditemukan pada arsip sistem" },
          { status: 404 }
        );
      }

      const signedBy = n.pimpinan_nama?.trim() || n.dipimpin_nama;
      const signedByPosition = n.pimpinan_jabatan?.trim() || n.dipimpin_jabatan || "";
      const signedByNip = n.pimpinan_nip?.trim() || n.dipimpin_nip || "";

      return NextResponse.json({
        success: true,
        message: "Berhasil mengambil data verifikasi dokumen",
        data: {
          id: n.id,
          title: n.judul,
          meeting_date: n.tanggal,
          start_time: n.waktu_mulai || null,
          end_time: n.waktu_selesai || null,
          location: n.tempat,
          opd_name: n.opd_name || "",
          status: n.status,
          signed_by: signedBy,
          signed_by_position: signedByPosition,
          signed_by_nip: signedByNip,
          notulist_name: n.notulis_nama,
          notulist_position: n.notulis_jabatan || "",
          notulist_nip: n.notulis_nip || "",
          finalized_at: n.updated_at,
        },
      });
    }

    // ── Mode Live (backend Go) ──────────────────────────────────
    const res = await fetch(`${BACKEND_URL}/public/notulen/${id}/verify`, {
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("GET public verifikasi error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
