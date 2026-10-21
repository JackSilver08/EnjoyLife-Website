"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";

const navigation = [
  { href: "/shop", label: "CỬA HÀNG" },
  { href: "/#our-story", label: "CÂU CHUYỆN" },
  { href: "/blog", label: "JOURNAL" },
  { href: "/#contact", label: "LIÊN HỆ" },
];

export function SiteHeader() {
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return <>
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Enjoy Life — Trang chủ" onClick={() => setMenuOpen(false)}>
        enjoy<span>life</span>
      </Link>
      <nav className={menuOpen ? "nav-links open" : "nav-links"} id="store-nav" aria-label="Điều hướng cửa hàng">
        {navigation.map(item => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >{item.label}</Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link href="/shop#shop-search" aria-label="Tìm sản phẩm"><Search size={20}/></Link>
        <Link href="/account" aria-label="Tài khoản"><UserRound size={19}/></Link>
        <Link href="/cart" aria-label={`Giỏ hàng, ${count} sản phẩm`} className="cart-nav">
          <ShoppingBag size={20}/>{count > 0 && <span>{count}</span>}
        </Link>
        <button type="button" className="menu-toggle" aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          aria-controls="store-nav" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </div>
    </header>
  </>;
}
