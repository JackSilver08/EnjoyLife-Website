import Link from "next/link";
import {fetchProducts} from "@/lib/api";
import {ProductCard} from "@/components/product-card";
export const metadata={title:"Cửa hàng"};
type Params={q?:string;category?:string;sort?:string};
const categories=[{slug:"",label:"Tất cả"},{slug:"ao",label:"Áo"},{slug:"quan",label:"Quần"},{slug:"outerwear",label:"Áo khoác"}];
export default async function Shop({searchParams}:{searchParams:Promise<Params>}){
 const p=await searchParams;
 const q=(p.q||"").trim().slice(0,100);
 const category=categories.some(c=>c.slug===p.category)?p.category||"":"";
 const sort=["newest","price-asc","price-desc"].includes(p.sort||"")?p.sort:"newest";
 const catalog=await fetchProducts(q);
 const products=catalog.filter(x=>!category||x.category_slug===category).sort((a,b)=>sort==="price-asc"?a.price_vnd-b.price_vnd:sort==="price-desc"?b.price_vnd-a.price_vnd:0);
 const link=(nextCategory:string)=>"/shop?"+new URLSearchParams({...q?{q}:{},...nextCategory?{category:nextCategory}:{},...sort!=="newest"?{sort}:{}}).toString();
 return <div className="shop-page page-shell">
  <div className="shop-head"><span className="eyebrow">ENJOY LIFE / CỬA HÀNG</span><h1>Khám phá <em>phong cách.</em></h1><p>Chọn những thiết kế phù hợp với chính bạn.</p></div>
  <div className="shop-tools-v2"><nav aria-label="Lọc theo loại sản phẩm" className="shop-categories">{categories.map(c=><Link key={c.slug} href={link(c.slug)} className={c.slug===category?"is-active":""} aria-current={c.slug===category?"page":undefined}>{c.label}</Link>)}</nav>
  <form action="/shop" className="shop-controls"><input type="hidden" name="category" value={category}/><label htmlFor="shop-search">Tìm sản phẩm</label><input id="shop-search" name="q" defaultValue={q} placeholder="Tên sản phẩm, phong cách..." /><label htmlFor="shop-sort">Sắp xếp</label><select id="shop-sort" name="sort" defaultValue={sort}><option value="newest">Mới nhất</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option></select><button type="submit">ÁP DỤNG ↗</button></form></div>
  <div className="shop-count" role="status">{products.length} SẢN PHẨM {category&&"TRONG DANH MỤC"}</div>
  {products.length?<div className="products-grid shop-grid">{products.map(x=><ProductCard product={x} key={x.id}/>)}</div>:<div className="empty-state"><p>Không tìm thấy sản phẩm phù hợp.</p><Link href="/shop">Xóa bộ lọc ↗</Link></div>}
 </div>;
}
