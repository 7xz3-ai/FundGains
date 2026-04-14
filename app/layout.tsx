"use client";

// app/layout.tsx
// Root layout: delegates provider stack to Providers.tsx.
// Premium fintech dark theme.

import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import "./globals-liquid.css";
import localFont from "next/font/local";
import Providers from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} font-sans bg-[#050508] text-[#F0F0F5] min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
