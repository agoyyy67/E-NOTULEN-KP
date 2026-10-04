import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { code, code_verifier, redirectUri } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Code is required" },
        { status: 400 }
      );
    }

    const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL || "https://accounts.purbalinggakab.go.id/auth";
    const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "apps";
    const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "e-notulen";
    const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET || process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_SECRET || "";

    const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

    const body = new URLSearchParams();
    body.append("grant_type", "authorization_code");
    body.append("code", code);
    body.append("client_id", clientId);
    if (clientSecret) {
      body.append("client_secret", clientSecret);
    }
    
    // Gunakan redirectUri dari request client jika ada, kalau tidak fallback ke appUrl
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    body.append("redirect_uri", redirectUri || `${appUrl}/auth/callback`);

    if (code_verifier) {
      body.append("code_verifier", code_verifier);
    }

    console.log(`[Token Exchange Proxy] Sending POST to ${tokenUrl}`);

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Token Exchange Proxy Failed]", res.status, errorText);
      return NextResponse.json(
        { success: false, message: `Keycloak rejected token exchange: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("[Token Exchange Proxy Error]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to exchange token" },
      { status: 500 }
    );
  }
}
