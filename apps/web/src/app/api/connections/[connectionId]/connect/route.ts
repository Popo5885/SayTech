import { NextResponse } from "next/server";
import { assertAdminConnectionAccess } from "../../../../../lib/live-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await context.params;

  try {
    await assertAdminConnectionAccess(connectionId);
  } catch {
    return NextResponse.json({ error: "פעולת חיבור זמינה לצוות הניהול בלבד." }, { status: 403 });
  }

  return NextResponse.json(
    { error: "פעולות חיבור זמינות רק דרך שירות החיבור הפעיל." },
    { status: 405 }
  );
}
