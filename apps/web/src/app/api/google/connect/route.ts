import { NextResponse } from "next/server";

export async function GET(request: Request) {
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_CLIENT_SECRET. Add it before completing the Google Contacts OAuth flow."
      },
      { status: 500 }
    );
  }

  const url = new URL("/api/auth/signin/google", request.url);
  url.searchParams.set("callbackUrl", "/dashboard/contacts");

  return NextResponse.redirect(url);
}
