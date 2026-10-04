import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseJwtPayload, COOKIE_ACCESS_TOKEN } from "@/lib/auth/session";
import { mapJwtToUserContext } from "@/lib/auth/keycloak";

/**
 * /api/auth/me — Returns the current user context from session
 * Reads access_token cookie, parses JWT claims, and returns the UserContext.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "No active session token found" },
        { status: 401 }
      );
    }

    const user = mapJwtToUserContext(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid session token claims" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("[/api/auth/me Error]", error);
    return NextResponse.json(
      { success: false, message: "Failed to resolve user session" },
      { status: 500 }
    );
  }
}
