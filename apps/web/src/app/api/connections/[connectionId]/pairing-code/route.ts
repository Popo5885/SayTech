import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await context.params;
  const { phone } = (await request.json()) as { phone?: string };
  const workerUrl = process.env.WA_WORKER_HTTP_URL?.replace(/\/$/, "");

  if (!phone?.trim()) {
    return NextResponse.json({ error: "חסר מספר טלפון להפקת קוד התאמה." }, { status: 400 });
  }

  if (!workerUrl) {
    return NextResponse.json(
      {
        error:
          "קוד התאמה מופק רק דרך ה-Worker החי. הגדירו WA_WORKER_HTTP_URL כדי לחבר את הפעולה."
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
      { error: "לא הצלחנו ליצור קשר עם ה-Worker להפקת קוד התאמה." },
      { status: 502 }
    );
  }
}
