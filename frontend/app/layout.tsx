import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Toaster from "@/components/Toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Browser tab title + description. The tab icon comes from the OKI logo
// files next to this layout (favicon.ico, icon.png, apple-icon.png), which
// Next.js picks up automatically. Individual pages can set their own
// title, shown as "<page> | OKI School".
export const metadata: Metadata = {
  title: {
    default: "OKI School – Symptom Tracker",
    template: "%s | OKI School",
  },
  description:
    "OKI International School Learning Support Unit — symptom tracking and emotion-aware learning planner.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
