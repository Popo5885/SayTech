import { NextResponse } from "next/server";
import { getGoogleOAuthSettings } from "../../../../lib/google-settings";

export async function GET(request: Request) {
  const googleSettings = await getGoogleOAuthSettings();

  if (!googleSettings.configured) {
    return NextResponse.redirect(
      new URL("/dashboard/google-connect?error=not-configured", request.url)
    );
  }

  const url = new URL("/api/auth/signin/google", request.url);
  url.searchParams.set("callbackUrl", "/dashboard/google-connect?connected=1");

  return NextResponse.redirect(url);
}
