import { NextResponse } from "next/server";
import { mockOpdList } from "@/lib/data/settings";

const APP_PORT = process.env.APP_PORT || "8088";
const BACKEND_URL = `http://enotulen-backend:${APP_PORT}/api/v1`;

export async function GET() {
  if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
    return NextResponse.json({
      success: true,
      data: mockOpdList,
    });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/public/opd`, {
      cache: "no-store",
    });
    
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({
      success: true,
      data: mockOpdList,
    });
  }
}
