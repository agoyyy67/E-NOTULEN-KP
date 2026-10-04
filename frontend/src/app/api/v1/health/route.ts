import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Service is healthy",
    data: {
      status: "UP",
      time: new Date().toISOString(),
    },
  });
}
