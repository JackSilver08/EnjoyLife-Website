import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { money } from "@/lib/format";
import type { Product } from "@/lib/types";
export function ProductCard({ product, index = 0 }: {product: Product; index?: number}) {
  return <Link className="product-card" href={`/products/${product.slug}`}>
    <div className="product-image">
      {product.image_url ? <Image src={product.image_url} alt={product.name} width={680} height={860} sizes="(max-width: 720px) 50vw, 25vw"/> : <div className="empty-photo"/>}
      <span className="product-tag">0{index + 1} / TUYỂN CHỌN</span>
      <span className="product-hover">XEM SẢN PHẨM <ArrowUpRight size={16}/></span>
    </div>
    <div className="product-caption"><div><h3>{product.name}</h3><p>{product.collection}</p></div><span>{money(product.price_vnd)}</span></div>
  </Link>;
}
