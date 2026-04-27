import { NextResponse } from "next/server";
import { getConnectionSnapshot } from "../../../../../lib/demo-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ connectionId: string }> }
) {
  const { connectionId } = await context.params;

  try {
    return NextResponse.json(await getConnectionSnapshot(connectionId));
  } catch {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }
}

export async function PATCH(
  _request: Request,
  _context: { params: Promise<{ connectionId: string }> }
) {
  return NextResponse.json(
    { error: "QR generation is handled only by the live WhatsApp worker." },
    { status: 405 }
  );
}
