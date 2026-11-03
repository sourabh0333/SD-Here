import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const orbitron = localFont({
  variable: "--font-display",
  src: [
    { path: "./fonts/orbitron-latin-700-normal.woff", weight: "700" },
    { path: "./fonts/orbitron-latin-900-normal.woff", weight: "900" },
  ],
});

const block = localFont({
  variable: "--font-block",
  src: "./fonts/archivo-black-latin-400-normal.woff",
});

export const metadata: Metadata = {
  title: "SD-Here",
  description: "SD-Here — a scroll-driven 3D portfolio by Sourabh.",
};

export const viewport: Viewport = {
  themeColor: "#dc9f9b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${orbitron.variable} ${block.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
