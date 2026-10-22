import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { canonical,getSiteUrl,mayIndex } from "@/lib/site-url";
import "./globals.css";
import "./redesign.css";
import "./sprint7.css";
export const metadata: Metadata = {
  title: { default: "Enjoy Life — Sống theo nhịp riêng", template: "%s | Enjoy Life" },
  description: "Enjoy Life — khám phá phong cách thời trang của riêng bạn.",
  metadataBase: getSiteUrl(),
  alternates: {canonical: canonical("/")},
  robots: {index: mayIndex(),follow: mayIndex()},
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="vi"><body><CartProvider>{children}</CartProvider></body></html>;
}
