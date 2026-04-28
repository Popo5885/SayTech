import { NextResponse } from "next/server";
import { getConnectionSnapshotForCurrentUser } from "../../../../../lib/live-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await context.params;

  try {
    return NextResponse.json(await getConnectionSnapshotForCurrentUser(connectionId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "Unauthorized." ? 401 : message === "Forbidden." ? 403 : 404;

    return NextResponse.json({ error: "החיבור לא נמצא או שאין הרשאה לצפות בו." }, { status });
  }
}

export async function PATCH(
  _request: Request,
  _context: { params: Promise<{ connectionId: string }> }
) {
  return NextResponse.json(
    { error: "יצירת QR מתבצעת רק דרך שירות החיבור הפעיל." },
    { status: 405 }
  );
}
