import { NextRequest, NextResponse } from "next/server";

/** Word (.docx) download — proxied from Go backend */
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
      candidateUrls.push(`${cleanEnv}/notulen/${id}/word`);
    } else {
      candidateUrls.push(`${cleanEnv}/api/v1/notulen/${id}/word`);
    }
  }

  const port = process.env.APP_PORT || 8080;
  candidateUrls.push(
    `http://enotulen-backend:${port}/api/v1/notulen/${id}/word`,
    `http://backend:${port}/api/v1/notulen/${id}/word`,
    `http://localhost:${port}/api/v1/notulen/${id}/word`
  );

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const cookieString = request.cookies.toString();
  if (cookieString) {
    headers["Cookie"] = cookieString;
  }

  let wordResponse: Response | null = null;
  let lastError: any = null;

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (res.ok) {
        wordResponse = res;
        break;
      } else {
        lastError = `HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (err: any) {
      lastError = err.message || err;
    }
  }

  if (!wordResponse) {
    return NextResponse.json(
      { message: `Failed to fetch Word document from backend (${lastError})` },
      { status: 500 }
    );
  }

  const wordBuffer = await wordResponse.arrayBuffer();
  return new NextResponse(wordBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Notulen_Rapat_${id.substring(0, 8)}.docx"`,
    },
  });
}
