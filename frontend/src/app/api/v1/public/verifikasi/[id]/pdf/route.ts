import { NextRequest, NextResponse } from "next/server";
import { mockNotulen } from "@/lib/data/notulen";

/**
 * Public PDF Download for Verified Documents
 *
 * GET /api/v1/public/verifikasi/[id]/pdf
 *
 * Mengizinkan pemindai QR Code (tanpa akun) mengunduh salinan resmi PDF,
 * khusus untuk dokumen berstatus "final".
 */

const APP_PORT = process.env.APP_PORT || "8088";
const BACKEND_URL = `http://enotulen-backend:${APP_PORT}/api/v1`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── Mode Mock ───────────────────────────────────────────────
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
      const n = mockNotulen[id];
      if (!n || n.status !== "final") {
        return NextResponse.json(
          { success: false, message: "Salinan resmi hanya tersedia untuk dokumen berstatus final" },
          { status: n ? 403 : 404 }
        );
      }
      const dummyPdf = Buffer.from(
        "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\n"
      );
      return new NextResponse(dummyPdf, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="Notulen_Rapat_${id.substring(0, 8)}.pdf"`,
        },
      });
    }

    // ── Mode Live (backend Go) ──────────────────────────────────
    const res = await fetch(`${BACKEND_URL}/public/notulen/${id}/pdf`, { cache: "no-store" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({
        success: false,
        message: "Gagal mengambil salinan dokumen",
      }));
      return NextResponse.json(data, { status: res.status });
    }

    const pdfBuffer = await res.arrayBuffer();
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          res.headers.get("Content-Disposition") ||
          `inline; filename="Notulen_Rapat_${id.substring(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("GET public verifikasi pdf error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
