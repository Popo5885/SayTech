import type { Metadata } from "next";
import { AccessibilityWidget } from "../components/accessibility-widget";
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
        <AccessibilityWidget />
      </body>
    </html>
  );
}
