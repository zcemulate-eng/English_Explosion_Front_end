import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // 新增

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: '--font-playfair',
});

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "English Explosion - 英语精听训练平台",
  description: "专为雅思备考设计的英语听力训练系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {/* Providers 包裹全部子页面，让 useAuth() 在任意页面都可用 */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}