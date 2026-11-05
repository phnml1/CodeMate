import type { Metadata } from "next";
import localFont from "next/font/local";
import Providers from "@/lib/providers";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

const manrope = localFont({
  src: "./fonts/manrope-latin.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | CodeMate",
    default: "CodeMate - AI 기반 코드 리뷰 플랫폼",
  },
  description: "GitHub 연동 AI 자동 코드 리뷰 및 실시간 협업 개발자 플랫폼",
  keywords: ["코드 리뷰", "AI", "GitHub", "코드 품질", "협업", "개발"],
  authors: [{ name: "CodeMate Team" }],
  openGraph: {
    title: "CodeMate",
    description: "GitHub 연동 AI 자동 코드 리뷰 및 실시간 협업 개발자 플랫폼",
    url: "https://codemate.dev",
    siteName: "CodeMate",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeMate",
    description: "GitHub 연동 AI 자동 코드 리뷰 및 실시간 협업 개발자 플랫폼",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} ${inter.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
