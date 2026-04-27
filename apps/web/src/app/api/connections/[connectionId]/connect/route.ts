import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  _context: { params: Promise<{ connectionId: string }> }
) {
  return NextResponse.json(
    { error: "Connection actions are available only through the live WhatsApp worker." },
    { status: 405 }
  );
}
