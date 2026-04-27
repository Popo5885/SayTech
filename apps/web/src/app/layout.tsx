import type { Metadata } from "next";
import { IBM_Plex_Sans_Hebrew, Space_Grotesk } from "next/font/google";
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
  title: "WhatsApp Lottery SaaS",
  description: "Manage WhatsApp lottery and referral campaigns from one clean dashboard."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${headingFont.variable} ${bodyFont.variable}`} lang="he">
      <body className="font-[var(--font-body)] antialiased">{children}</body>
    </html>
  );
}
