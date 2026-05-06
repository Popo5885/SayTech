import { NextResponse } from "next/server";
import { assertAdminConnectionAccess } from "../../../../../lib/live-store";

// SECURITY: only allow safe identifier characters before forwarding to the worker
// (prevents SSRF / path traversal via crafted connectionId).
const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

export async function POST(
  request: Request,
  context: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await context.params;

  if (!SAFE_ID.test(connectionId)) {
    return NextResponse.json({ error: "Invalid connection identifier." }, { status: 400 });
  }

  try {
    await assertAdminConnectionAccess(connectionId);
  } catch {
    return NextResponse.json({ error: "קוד התאמה זמין לצוות הניהול בלבד." }, { status: 403 });
  }

  const { phone } = (await request.json()) as { phone?: string };
  const workerUrl = process.env.WA_WORKER_HTTP_URL?.replace(/\/$/, "");

  if (!phone?.trim()) {
    return NextResponse.json({ error: "חסר מספר טלפון להפקת קוד התאמה." }, { status: 400 });
  }

  if (!workerUrl) {
    return NextResponse.json(
      {
        error:
          "קוד התאמה מופק רק כששירות החיבור פעיל. פנו לצוות Magic Flow להפעלת החיבור."
      },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(`${workerUrl}/connections/${connectionId}/pairing-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });
    const data = (await response.json()) as unknown;

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "לא הצלחנו ליצור קשר עם שירות החיבור להפקת קוד התאמה." },
      { status: 502 }
    );
  }
}
