import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

export function HEAD() {
  return new NextResponse(null, { status: 200 });
}
