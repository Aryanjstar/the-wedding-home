import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Yatra_One } from "next/font/google";
import type { ReactNode } from "react";

import { SessionProvider } from "@/components/session";

import "./globals.css";
import "../styles/app.css";
import "../styles/guest.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-serif" });
const yatra = Yatra_One({ subsets: ["latin", "devanagari"], weight: "400", variable: "--font-devanagari" });

export const metadata: Metadata = {
  title: "The Wedding Home",
  description: "The operating system for Indian marriages. Functions, households and RSVPs, tasks, a rupee spend log, vendors, a themed guest site, and a shared gallery.",
};

export const viewport: Viewport = {
  themeColor: "#2a0c12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${yatra.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
