import { NextRequest, NextResponse } from "next/server";

/** PDF download — proxied from Go backend */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.cookies.get("access_token")?.value;

  const envBackend = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL;
  const candidateUrls: string[] = [];

  if (envBackend) {
    const cleanEnv = envBackend.replace(/\/$/, "");
    if (cleanEnv.endsWith("/api/v1")) {
      candidateUrls.push(`${cleanEnv}/notulen/${id}/download`);
    } else {
      candidateUrls.push(`${cleanEnv}/api/v1/notulen/${id}/download`);
    }
  }

  const port = process.env.APP_PORT || 8088;
  candidateUrls.push(
    `http://enotulen-backend:${port}/api/v1/notulen/${id}/download`,
    `http://backend:${port}/api/v1/notulen/${id}/download`,
    `http://localhost:${port}/api/v1/notulen/${id}/download`
  );

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const cookieString = request.cookies.toString();
  if (cookieString) {
    headers["Cookie"] = cookieString;
  }

  let pdfResponse: Response | null = null;
  let lastError: any = null;

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (res.ok) {
        pdfResponse = res;
        break;
      } else {
        lastError = `HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (err: any) {
      lastError = err.message || err;
    }
  }

  if (!pdfResponse) {
    if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
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

    return NextResponse.json(
      { message: `Failed to fetch PDF from backend (${lastError})` },
      { status: 500 }
    );
  }

  const pdfBuffer = await pdfResponse.arrayBuffer();
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Notulen_Rapat_${id.substring(0, 8)}.pdf"`,
    },
  });
}
