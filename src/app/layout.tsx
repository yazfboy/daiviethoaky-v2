import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Noto_Serif } from "next/font/google";
import "./globals.css";

// Font được next/font tải về lúc build và phục vụ từ chính server (không gọi Google Fonts lúc chạy).
// Cả hai font đều có bộ chữ tiếng Việt để hiển thị đủ dấu.
const body = Noto_Serif({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

const title = Cormorant_Garamond({
  subsets: ["vietnamese", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-title",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Đại Việt Họa Ký",
  description: "Trò chuyện nhập vai cùng danh nhân nước Việt.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3ead6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${title.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
