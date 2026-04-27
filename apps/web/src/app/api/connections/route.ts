import { NextResponse } from "next/server";
import { getPrimaryStore } from "../../../lib/demo-store";

export async function GET() {
  const store = await getPrimaryStore();

  return NextResponse.json(store ? [store.connection] : []);
}
