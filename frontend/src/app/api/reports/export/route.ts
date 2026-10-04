import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = request.cookies.get("access_token")?.value;

  const port = process.env.APP_PORT || 8088;
  const backendUrl = `http://enotulen-backend:${port}/api/v1/reports/export?${searchParams.toString()}`;

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const cookieString = request.cookies.toString();
  if (cookieString) {
    headers["Cookie"] = cookieString;
  }

  try {
    const res = await fetch(backendUrl, { headers });
    if (!res.ok) {
      return NextResponse.json(
        { message: `Backend error: ${res.statusText}` },
        { status: res.status }
      );
    }

    const pdfBuffer = await res.arrayBuffer();
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Laporan_Notulensi_${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message || "Failed to fetch PDF report from backend" },
      { status: 500 }
    );
  }
}
