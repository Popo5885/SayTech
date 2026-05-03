"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  readConsent,
  type ConsentValue
} from "./cookie-consent";

// Facebook Pixel that boots PageView **only** after the user has explicitly
// consented to marketing/analytics cookies (either via "Accept all" or via
// the Manage preferences modal).
//
// To swap pixel IDs, change the value of NEXT_PUBLIC_FB_PIXEL_ID env var or
// the DEFAULT_PIXEL_ID below.
//
// <!-- אם תרצה להשתמש בפיקסל אחר, החלף את הקוד כאן -->
const DEFAULT_PIXEL_ID = "XX-XXX-X-X-X";

export function FacebookPixel() {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID || DEFAULT_PIXEL_ID;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const initial = readConsent();
    if (initial?.marketing) {
      setEnabled(true);
    }

    function onConsent(event: Event) {
      const detail = (event as CustomEvent<ConsentValue>).detail;
      if (detail?.marketing) setEnabled(true);
    }

    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  // Don't render anything (and therefore don't load Meta's script) until the
  // user has opted in.
  if (!enabled) return null;

  // Don't initialize a placeholder pixel ID — that would silently call
  // Meta's API with an obviously bogus value.
  if (!pixelId || pixelId === DEFAULT_PIXEL_ID) {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.info("[fb-pixel] skipped — placeholder pixel id; set NEXT_PUBLIC_FB_PIXEL_ID");
    }
    return null;
  }

  return (
    <>
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img
          alt=""
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
