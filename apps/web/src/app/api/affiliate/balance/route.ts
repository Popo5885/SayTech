import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getPrimaryStore } from "../../../../lib/live-store";
import { getBalance, getLedger } from "../../../../lib/affiliate-points";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await getPrimaryStore();
  if (!store) return NextResponse.json({ balance: 0, ledger: [] });

  const [balance, ledger] = await Promise.all([
    getBalance(store.workspace.id),
    getLedger(store.workspace.id, 30)
  ]);

  return NextResponse.json({ balance, ledger });
}
