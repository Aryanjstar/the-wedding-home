import type { Metadata } from "next";
import { Inter, Playfair_Display, Yatra_One } from "next/font/google";
import type { ReactNode } from "react";

import { PreviewSessionProvider } from "@/components/preview-session";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-serif" });
const yatra = Yatra_One({ subsets: ["latin", "devanagari"], weight: "400", variable: "--font-devanagari" });

export const metadata: Metadata = {
  title: "The Wedding Home",
  description: "The operating system for Indian marriages. The family shares events, guests, tasks, and a guest website. Guests open a link. No account.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${yatra.variable}`}>
      <body>
        <PreviewSessionProvider>{children}</PreviewSessionProvider>
      </body>
    </html>
  );
}
