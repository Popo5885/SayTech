import { NextResponse } from "next/server";
import { getGoogleOAuthSettings } from "../../../../lib/google-settings";

export async function GET(request: Request) {
  const googleSettings = await getGoogleOAuthSettings();

  if (!googleSettings.configured) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_CLIENT_SECRET. Add it in the admin interface before completing the Google OAuth flow."
      },
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  const url = new URL("/api/auth/signin/google", request.url);
  url.searchParams.set("callbackUrl", "/dashboard/contacts");

  return NextResponse.redirect(url);
}
