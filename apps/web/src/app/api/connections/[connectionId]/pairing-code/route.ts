import { NextResponse } from "next/server";
import { assertAdminConnectionAccess } from "../../../../../lib/live-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await context.params;

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
