"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";
const links=[{href:"/shop",label:"Cửa hàng"},{href:"/#lookbook",label:"Phong cách"},{href:"/about",label:"Câu chuyện"}];
export function SiteHeader() {
  const [open,setOpen]=useState(false);
  const path=usePathname();
  const {count}=useCart();
  return <>
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Enjoy Life — Trang chủ" onClick={()=>setOpen(false)}>enjoy<span>life</span></Link>
      <nav className={open?"nav-links open":"nav-links"} aria-label="Điều hướng chính" id="site-nav">
        {links.map(item=><Link key={item.href} onClick={()=>setOpen(false)} href={item.href} aria-current={path===item.href?"page":undefined}>{item.label.toUpperCase()}</Link>)}
      </nav>
      <div className="header-actions">
        <Link href="/shop#shop-search" aria-label="Tìm sản phẩm"><Search size={20}/></Link>
        <Link href="/cart" aria-label={"Giỏ hàng, "+count+" sản phẩm"} className="cart-nav"><ShoppingBag size={20}/>{count>0&&<span>{count}</span>}</Link>
        <button className="menu-toggle" type="button" onClick={()=>setOpen(!open)} aria-controls="site-nav" aria-expanded={open} aria-label={open?"Đóng menu":"Mở menu"}>{open?<X/>:<Menu/>}</button>
      </div>
    </header>
  </>;
}
