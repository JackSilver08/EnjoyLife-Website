import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-top"><p>GIỮ LẠI CẢM HỨNG.</p><Link href="/shop">Tìm phong cách mỗi ngày của bạn <ArrowUpRight size={24}/></Link></div>
    <div className="footer-bottom"><span className="footer-logo">enjoylife®</span><div><Link href="/shop">Cửa hàng</Link><Link href="/about">Câu chuyện</Link><Link href="/cart">Giỏ hàng</Link></div><p>© 2026 Enjoy Life · Bản phát triển thử nghiệm</p></div>
  </footer>;
}
