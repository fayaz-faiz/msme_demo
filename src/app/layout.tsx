import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { AppHeader } from "@/shared/ui/AppHeader";
import { PwaRegister } from "@/shared/pwa/PwaRegister";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "NearShop",
  description: "Nearshop Buyer App",
  manifest: "/manifest.webmanifest",
};

export const dynamic = 'force-dynamic';
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b5fff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <PwaRegister />
        <Providers>
          <AppHeader />
          <main className="app-shell">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
