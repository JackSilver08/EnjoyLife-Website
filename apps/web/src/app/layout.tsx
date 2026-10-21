import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import "./globals.css";
import "./redesign.css";
export const metadata: Metadata = {
  title: { default: "Enjoy Life — Sống theo nhịp riêng", template: "%s | Enjoy Life" },
  description: "Enjoy Life — khám phá phong cách thời trang của riêng bạn.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="vi"><body><CartProvider>{children}</CartProvider></body></html>;
}
