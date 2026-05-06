import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { getPrimaryStore } from "../../../lib/live-store";

export async function GET() {
  // SECURITY: require an authenticated session before returning connection data.
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const store = await getPrimaryStore();

  return NextResponse.json(
    store
      ? [
          {
            ...store.connection,
            qrCode: null,
            sessionKey: "",
            lastError: null
          }
        ]
      : []
  );
}
