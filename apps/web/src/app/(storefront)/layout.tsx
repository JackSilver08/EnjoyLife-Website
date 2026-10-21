import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatPanel } from "@/components/chat-panel";
export default function StorefrontLayout({children}: Readonly<{children:React.ReactNode}>) {
  return <><SiteHeader/><main id="main-content">{children}</main><SiteFooter/><ChatPanel/></>;
}
