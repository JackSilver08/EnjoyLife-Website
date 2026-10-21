"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, Search, ShoppingBag, X, ArrowUpRight } from "lucide-react";
import { useCart } from "@/components/cart-provider";
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  return <>
    <div className="announcement">TẬN HƯỞNG KHOẢNH KHẮC. SỞ HỮU PHONG CÁCH CỦA BẠN. <span>— TỪ 2026</span></div>
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Enjoy Life — Trang chủ">enjoy<span>life</span><sup>®</sup></Link>
      <nav className={open ? "nav-links open" : "nav-links"} aria-label="Điều hướng chính">
        <Link onClick={() => setOpen(false)} href="/shop">CỬA HÀNG <ArrowUpRight size={13}/></Link>
        <Link onClick={() => setOpen(false)} href="/shop">BỘ SƯU TẬP</Link>
        <Link onClick={() => setOpen(false)} href="/about">CÂU CHUYỆN</Link>
        <Link onClick={() => setOpen(false)} href="/admin">XEM TRƯỚC QUẢN TRỊ</Link>
      </nav>
      <div className="header-actions">
        <Link href="/shop" aria-label="Tìm sản phẩm"><Search size={20}/></Link>
        <Link href="/cart" aria-label={`Giỏ hàng ${count} sản phẩm`} className="cart-nav"><ShoppingBag size={20}/><span>{count}</span></Link>
        <button className="menu-toggle" type="button" onClick={() => setOpen(!open)} aria-label={open ? "Đóng menu" : "Mở menu"}>{open ? <X/> : <Menu/>}</button>
      </div>
    </header>
  </>;
}
