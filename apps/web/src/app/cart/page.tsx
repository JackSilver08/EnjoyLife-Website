"use client";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ArrowUpRight, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { money } from "@/lib/format";
export default function CartPage() {
  const {items,remove,setQuantity,total} = useCart();
  return <div className="page-shell bag-page"><span className="eyebrow">ENJOY LIFE / LỰA CHỌN CỦA BẠN</span><h1>Giỏ <em>hàng.</em></h1>{!items.length ? <div className="empty-state"><p>Giỏ hàng của bạn đang trống.</p><Link className="button-dark" href="/shop">KHÁM PHÁ SẢN PHẨM <ArrowUpRight size={18}/></Link></div> : <div className="bag-layout"><div className="bag-list">{items.map(item=><article className="bag-item" key={item.variantId}><div className="bag-photo">{item.image && <Image src={item.image} alt={item.name} width={180} height={220}/>}</div><div className="bag-item-info"><strong>{item.name}</strong><p>{item.color} / {item.size}</p><span>{money(item.price)}</span><div className="quantity-control"><button aria-label="Giảm số lượng" onClick={()=>setQuantity(item.variantId,item.quantity-1)}><Minus size={13}/></button>{item.quantity}<button aria-label="Tăng số lượng" onClick={()=>setQuantity(item.variantId,item.quantity+1)}><Plus size={13}/></button></div></div><button className="delete-item" onClick={()=>remove(item.variantId)} aria-label="Xóa khỏi giỏ"><Trash2 size={18}/></button></article>)}</div><aside className="bag-summary"><h2>Tóm tắt đơn hàng</h2><div className="summary-line"><span>Tạm tính</span><strong>{money(total)}</strong></div><div className="summary-line"><span>Vận chuyển</span><span>Xác nhận sau</span></div><div className="summary-line total"><strong>Tổng tiền hàng</strong><strong>{money(total)}</strong></div><p>Giá cuối cùng và số lượng khả dụng sẽ được xác nhận khi tạo đơn.</p><Link className="button-dark full-width" href="/checkout">TIẾN HÀNH ĐẶT HÀNG <ArrowUpRight size={17}/></Link></aside></div>}</div>;
}
