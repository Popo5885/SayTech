"use client";

import Script from "next/script";

// UserWay accessibility widget. The account code below is the production code
// for Magic Flow. To swap accounts, change the value of `data-account` on the
// <Script /> tag (or set NEXT_PUBLIC_USERWAY_ACCOUNT to override at build time).
//
// <!-- אם תפתח חשבון חדש, החלף את הקוד כאן -->
const DEFAULT_USERWAY_ACCOUNT = "xGbuFwtt4s";

export function UserWayWidget() {
  const account = process.env.NEXT_PUBLIC_USERWAY_ACCOUNT || DEFAULT_USERWAY_ACCOUNT;

  return (
    <Script
      id="userway-widget"
      src="https://cdn.userway.org/widget.js"
      data-account={account}
      strategy="afterInteractive"
    />
  );
}
