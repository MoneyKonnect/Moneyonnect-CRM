import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  icons: {
    icon: "/mk-logo.jpeg",
    shortcut: "/mk-logo.jpeg",
    apple: "/mk-logo.jpeg",
  },
  title: {
    default: "RelationIQ — Client Relationship Intelligence",
    template: "%s | RelationIQ",
  },
  description: "Enterprise CRM for financial advisors. Manage clients, leads, and relationships with intelligence.",
  keywords: ["CRM", "financial advisor", "client management", "wealth management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
              },
            }}
          />
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
