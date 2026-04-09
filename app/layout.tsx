import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Inter } from "next/font/google";
import Providers from "@/lib/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
