"use client";
import Link from "next/link";
import { Search, ShoppingBag, UserRound } from "lucide-react";
import { useCart } from "@/components/cart-provider";
export function SiteHeader() {
  const {count}=useCart();
  return <>
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Enjoy Life — Trang chủ">enjoy<span>life</span></Link>
      <div className="header-actions">
        <Link href="/shop#shop-search" aria-label="Tìm sản phẩm"><Search size={20}/></Link>
        <Link href="/account" aria-label="Tài khoản"><UserRound size={19}/></Link>
        <Link href="/cart" aria-label={"Giỏ hàng, "+count+" sản phẩm"} className="cart-nav"><ShoppingBag size={20}/>{count>0&&<span>{count}</span>}</Link>
      </div>
    </header>
  </>;
}
