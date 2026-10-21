import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { money } from "@/lib/format";
import type {Product} from "@/lib/types";
export function ProductCard({product}: {product:Product;index?:number}){
  const soldOut=typeof product.available==="number"&&product.available<=0;
  return <Link className="product-card" href={"/products/"+product.slug} aria-label={product.name+", "+money(product.price_vnd)}>
    <div className="product-image">{product.image_url?<Image src={product.image_url} alt={product.name} width={680} height={860} sizes="(max-width: 720px) 50vw, (max-width: 1050px) 33vw, 25vw"/>:<div className="empty-photo"/>}
      {soldOut&&<span className="product-tag">HẾT HÀNG</span>}
      <span className="product-hover">XEM CHI TIẾT <ArrowUpRight size={16}/></span>
    </div><div className="product-caption"><div><h3>{product.name}</h3><p>{product.collection}</p></div><span>{money(product.price_vnd)}</span></div>
  </Link>;
}
