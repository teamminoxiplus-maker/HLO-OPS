import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: BRAND.fullName,
    template: `%s · ${BRAND.appName}`,
  },
  description: `${BRAND.name} internal operations portal — orders, production, and content in one place.`,
  applicationName: BRAND.appName,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1a7a52" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1f18" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">{children}</body>
    </html>
  );
}
