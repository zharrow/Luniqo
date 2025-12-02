import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  title: "Gestion de crèches",
  description: "Application de gestion de crèche avec traçabilité HACCP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
