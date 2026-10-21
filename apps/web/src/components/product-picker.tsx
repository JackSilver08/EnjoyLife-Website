"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";
export function ProductPicker({ product }: { product: Product }) {
  const { add } = useCart();
  const colors = [...new Set(product.variants.map((v) => v.color))];
  const [color, setColor] = useState(colors[0] ?? "");
  const sizes = product.variants.filter(v => v.color === color);
  const [size, setSize] = useState(sizes[0]?.size ?? "");
  const [added, setAdded] = useState(false);
  const selected = useMemo(() => product.variants.find(v => v.color === color && v.size === size), [product, color, size]);
  const chooseColor = (value: string) => { setColor(value); setSize(product.variants.find(v => v.color === value)?.size ?? ""); setAdded(false); };
  const addToBag = () => {
    if (!selected || selected.available <= 0) return;
    add({ variantId: selected.id, productSlug: product.slug, name: product.name, sku: selected.sku, color: selected.color, size: selected.size, price: selected.price_vnd, image: product.image_url, quantity: 1 });
    setAdded(true);
  };
  return <div className="picker">
    <span className="eyebrow">ENJOY LIFE / {product.collection}</span>
    <h1 className="detail-title">{product.name}</h1>
    <p className="detail-price">{money(selected?.price_vnd ?? product.price_vnd)}</p>
    <div className="long-rule"/>
    <p className="detail-description">{product.description}</p>
    <div className="option-set"><div className="option-title"><strong>MÀU SẮC</strong><span>{color}</span></div><div className="option-row">{colors.map(value => <button key={value} type="button" className={`pill ${color === value ? "selected" : ""}`} onClick={() => chooseColor(value)}>{value}</button>)}</div></div>
    <div className="option-set"><div className="option-title"><strong>KÍCH THƯỚC</strong><span>Hướng dẫn chọn cỡ — sắp ra mắt</span></div><div className="option-row">{sizes.map(v => <button key={v.id} type="button" className={`pill size ${size===v.size?"selected":""}`} onClick={() => { setSize(v.size); setAdded(false); }} disabled={v.available===0}>{v.size}{v.available===0 && " · Hết"}</button>)}</div></div>
    <p className="inventory-hint">{selected ? selected.available > 0 ? `Còn ${selected.available} sản phẩm khả dụng` : "Biến thể này đang hết hàng" : "Vui lòng chọn màu và cỡ"}</p>
    <button className="button-dark full-width" type="button" onClick={addToBag} disabled={!selected || selected.available===0}>{added ? <><Check size={17}/> ĐÃ THÊM VÀO GIỎ</> : <><ShoppingBag size={17}/> THÊM VÀO GIỎ</>}</button>
    {added && <Link className="simple-link" href="/cart">Xem giỏ hàng ↗</Link>}
    <div className="buyer-notes"><span>01 — Giao hàng theo xác nhận của cửa hàng</span><span>02 — Thanh toán COD; QR đang tích hợp</span><span>03 — Sản phẩm và giá hiển thị là dữ liệu mẫu</span></div>
  </div>;
}
