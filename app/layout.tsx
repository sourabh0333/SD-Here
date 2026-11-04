import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { content } from "@/lib/content";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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

const description = `${content.name} — ${content.role}. ${content.headline}`;

export const metadata: Metadata = {
  metadataBase: new URL(content.siteUrl),
  title: {
    default: `${content.name} — ${content.role}`,
    template: `%s · ${content.name}`,
  },
  description,
  applicationName: "SD-Here",
  authors: [{ name: content.name }],
  keywords: ["frontend developer", "React", "Next.js", "Three.js", "WebGL", "portfolio", content.name],
  openGraph: {
    type: "website",
    siteName: `${content.name} · Portfolio`,
    title: `${content.name} — ${content.role}`,
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${content.name} — ${content.role}`,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#dc9f9b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${block.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
