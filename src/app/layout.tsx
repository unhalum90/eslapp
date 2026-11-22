import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const siteOrigin =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Atelier de séquences",
  description: "Construire des dossiers de séquence d’anglais prêts à enseigner, avec versions standard, PAP et correction alignées.",
  openGraph: {
    title: "Atelier de séquences",
    description: "Des dossiers prêts à enseigner : plan, fiches professeur, versions élève et PAP, correction et évaluation.",
    images: [{ url: "/og.png", width: 1760, height: 931, alt: "Atelier de séquences — des dossiers prêts à enseigner" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Atelier de séquences",
    description: "Des dossiers prêts à enseigner, avec versions standard, PAP et correction alignées.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full flex flex-col`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
