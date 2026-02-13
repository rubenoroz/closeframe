import "./globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Spline_Sans } from "next/font/google";
import Providers from "@/components/Providers";
import ClosseAssistant from "@/components/closer/ClosseAssistant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const splineSans = Spline_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-spline",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.closerlens.com"),
  title: "Closerlens - Galerías Profesionales",
  description: "Plataforma de galerías fotográficas profesionales sin almacenamiento",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-white.svg", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Closerlens - Galerías Profesionales",
    description: "Plataforma de galerías fotográficas profesionales sin almacenamiento",
    url: "https://www.closerlens.com",
    siteName: "Closerlens",
    images: [
      {
        url: "https://www.closerlens.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Closerlens - Galerías Profesionales",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Closerlens - Galerías Profesionales",
    description: "Plataforma de galerías fotográficas profesionales sin almacenamiento",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${splineSans.variable} antialiased`}
      >
        {/* Load Material Symbols from Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
        <Providers>
          {children}
          <ClosseAssistant />
        </Providers>
      </body>
    </html>
  );
}
