import Link from "next/link";
export function SiteFooter(){
  return <footer className="site-footer footer-v2"><div className="footer-v2-inner page-shell">
    <div className="footer-v2-brand"><span className="footer-logo">enjoylife</span><p>Trang phục cho những ngày bình thường đáng nhớ.</p></div>
    <nav aria-label="Thông tin cửa hàng" className="footer-v2-links"><Link href="/shop">Cửa hàng</Link><Link href="/about">Câu chuyện</Link><Link href="/policies">Giao hàng & đổi trả</Link><Link href="/cart">Giỏ hàng</Link></nav>
    <small>© {new Date().getFullYear()} Enjoy Life</small>
  </div></footer>;
}
