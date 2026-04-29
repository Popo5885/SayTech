"use client";

import { CheckCircle2, Clock3 } from "lucide-react";
import type { ConnectionSnapshot, Workspace } from "@lottery/core/domain";
import { Card } from "@lottery/ui";

function isReady(snapshot: ConnectionSnapshot, workspace: Workspace): boolean {
  return (
    workspace.numberPoolStatus === "assigned" &&
    snapshot.status === "connected" &&
    Boolean(snapshot.phoneNumber)
  );
}

export function ZeroTouchConnectionCard({
  snapshot,
  workspace
}: {
  snapshot: ConnectionSnapshot;
  workspace: Workspace;
}) {
  const ready = isReady(snapshot, workspace);
  const phone = snapshot.phoneNumber ?? workspace.phoneNumber ?? null;

  return (
    <Card className="overflow-hidden p-0" dir="rtl">
      <div
        className={
          ready
            ? "bg-gradient-to-l from-emerald-500 to-teal-500 p-6 text-white"
            : "bg-gradient-to-l from-amber-400 to-orange-400 p-6 text-slate-950"
        }
        data-tour="connection-status"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black">
              <span className={`h-3 w-3 rounded-full ${ready ? "animate-pulse bg-white" : "bg-slate-950/40"}`} />
              {ready ? "המספר שלך מוכן" : "המספר בהכנה"}
            </div>
            <h2 className="mt-4 text-3xl font-black">
              {ready ? (
                <>
                  סטטוס: מחובר לתשתית WhatsApp Official של Magic Flow ·{" "}
                  <span dir="ltr">{phone}</span>
                </>
              ) : (
                "צוות Magic Flow מכין את החיבור הרשמי"
              )}
            </h2>
            <p className={`mt-3 max-w-2xl text-sm leading-6 ${ready ? "text-emerald-50" : "text-slate-800"}`}>
              {ready
                ? "המספר מוקצה אוטומטית מהמאגר. אין QR, אין Pairing Code ואין פעולה טכנית מצד הלקוח."
                : "כשהמספר הרשמי יוקצה, הדשבורד יתעדכן אוטומטית ויהיה מוכן לקבל משתתפים."}
            </p>
          </div>
          {ready ? <CheckCircle2 className="h-12 w-12" /> : <Clock3 className="h-12 w-12" />}
        </div>
      </div>
    </Card>
  );
}
