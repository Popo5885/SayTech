import type { Metadata } from "next";
import { ConnectionRecoveryBanner } from "../components/connection-recovery-banner";
import { CookieConsent } from "../components/cookie-consent";
import { FacebookPixel } from "../components/facebook-pixel";
import { UserWayWidget } from "../components/userway-widget";
import "driver.js/dist/driver.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magic Flow | ניהול הגרלות WhatsApp",
  description: "מערכת עברית פשוטה לניהול הגרלות WhatsApp, לידים, אנשי קשר והפניות."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html dir="rtl" lang="he">
      <body className="font-[var(--font-body)] antialiased">
        {children}
        {/* Global connection recovery overlay — detects server/WS drops. */}
        <ConnectionRecoveryBanner />
        {/* UserWay third-party accessibility widget — loaded after interaction. */}
        <UserWayWidget />
        {/* Cookie consent banner. Marketing scripts wait for the consent event. */}
        <CookieConsent />
        {/* Facebook Pixel — only fires PageView after explicit marketing opt-in. */}
        <FacebookPixel />
      </body>
    </html>
  );
}
