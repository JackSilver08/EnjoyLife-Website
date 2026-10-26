import Image from "next/image";
import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import {money} from "@/lib/format";
import type {Product} from "@/lib/types";

/**
 * Home-only editorial presentation. The existing ProductCard on /shop is
 * intentionally unchanged. API /products returns published, active products
 * in newest-first order; never synthesize filler products.
 */
export function LatestEditorialProducts({products}:{products:Product[]}){
 const latest=products.slice(0,5);
 if(latest.length===0){
  return <div className="empty-state">Cửa hàng đang cập nhật những thiết kế mới. <Link href="/shop">Khám phá cửa hàng ↗</Link></div>;
 }
 return <div className={`latest-editorial-grid latest-editorial-count-${latest.length}`} aria-label="Năm sản phẩm mới nhất của Enjoy Life">
  {latest.map((product,index)=>{
   const hero=index===0;
   const soldOut=typeof product.available==="number"&&product.available<=0;
   const alternateImage=product.images?.find(image=>image.url&&image.url!==product.image_url)?.url;
   return <Link key={product.id} href={`/products/${encodeURIComponent(product.slug)}`}
    className={`latest-editorial-item${hero?" latest-editorial-hero":""}`}
    aria-label={`${product.name}, ${money(product.price_vnd)}${soldOut?", hiện hết hàng":""}. Xem chi tiết`}>
    <div className="latest-editorial-photo">
     {product.image_url
      ?<Image className="latest-editorial-image" src={product.image_url} alt={product.name}
        fill priority={hero} sizes={hero
         ?"(max-width: 767px) calc(100vw - 36px), (max-width: 1023px) 90vw, (max-width: 1280px) 46vw, 560px"
         :"(max-width: 767px) calc((100vw - 48px) / 2), (max-width: 1023px) 43vw, 290px"}/>
      :<div className="latest-editorial-placeholder" aria-label="Sản phẩm chưa có ảnh">
        <span>ENJOY LIFE</span><small>STUDIO EDIT</small>
       </div>}
     {alternateImage&&product.image_url&&<Image className="latest-editorial-hover-image" src={alternateImage} alt=""
       fill loading="lazy" sizes="(max-width: 767px) 45vw, (max-width: 1023px) 43vw, 360px"/>}
     <span className="latest-editorial-discover" aria-hidden="true">XEM CHI TIẾT <ArrowUpRight size={14}/></span>
     {soldOut&&<span className="latest-editorial-sold-out">HẾT HÀNG</span>}
     {hero&&<span className="latest-editorial-photo-index" aria-hidden="true">01 / NEW ARRIVAL</span>}
    </div>
    <div className="latest-editorial-info">
     <div className="latest-editorial-copy">
      <h3>{product.name}</h3>
      <span className="latest-editorial-price">{money(product.price_vnd)}</span>
     </div>
     <ArrowUpRight className="latest-editorial-arrow" size={18} aria-hidden="true"/>
    </div>
   </Link>;
  })}
 </div>;
}
