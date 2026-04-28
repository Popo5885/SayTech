import type { Metadata } from "next";
import { IBM_Plex_Sans_Hebrew, Space_Grotesk } from "next/font/google";
import { AccessibilityWidget } from "../components/accessibility-widget";
import "driver.js/dist/driver.css";
import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading"
});

const bodyFont = IBM_Plex_Sans_Hebrew({
  subsets: ["latin", "hebrew"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

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
    <html className={`${headingFont.variable} ${bodyFont.variable}`} dir="rtl" lang="he">
      <body className="font-[var(--font-body)] antialiased">
        {children}
        <AccessibilityWidget />
      </body>
    </html>
  );
}
