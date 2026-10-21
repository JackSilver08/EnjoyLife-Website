import type { Metadata } from "next";
import { CartProvider } from "@/components/cart-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatPanel } from "@/components/chat-panel";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Enjoy Life — Sống theo nhịp riêng", template: "%s | Enjoy Life" },
  description: "Enjoy Life — thời trang cho những khoảnh khắc đời thường. Website đang được phát triển.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" data-scroll-behavior="smooth"><body><CartProvider><SiteHeader/><main>{children}</main><SiteFooter/><ChatPanel/></CartProvider></body></html>;
}
