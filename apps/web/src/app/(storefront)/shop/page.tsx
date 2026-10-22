import Link from "next/link";
import {fetchCatalog,fetchCatalogFilters,type CatalogParams} from "@/lib/api";
import {ProductCard} from "@/components/product-card";

export const metadata={title:"Cửa hàng"};
const categories=[{slug:"",label:"Tất cả"},{slug:"ao",label:"Áo"},{slug:"quan",label:"Quần"},
 {slug:"outerwear",label:"Áo khoác"},{slug:"vay-dam",label:"Váy đầm"},
 {slug:"giay-dep",label:"Giày dép"},{slug:"tui-xach",label:"Túi xách"},
 {slug:"trang-suc",label:"Trang sức"},{slug:"mu-non",label:"Mũ nón"},{slug:"khan-choang",label:"Khăn choàng"}];
const validSort=["newest","price-asc","price-desc"];
function safeNumber(value?:string){if(!value||!/^[0-9]{1,9}$/.test(value))return "";return value}
export default async function Shop({searchParams}:{searchParams:Promise<CatalogParams>}){
 const incoming=await searchParams;
 const q=(incoming.q||"").trim().slice(0,100);
 const category=categories.some(c=>c.slug===incoming.category)?incoming.category||"":"";
 const sort=validSort.includes(incoming.sort||"")?incoming.sort||"newest":"newest";
 const filters=await fetchCatalogFilters();
 const color=filters.colors.includes(incoming.color||"")?incoming.color||"":"";
 const size=filters.sizes.includes(incoming.size||"")?incoming.size||"":"";
 const min_price=safeNumber(incoming.min_price);
 const max_price=safeNumber(incoming.max_price);
 const page=String(Math.max(1,Math.min(1000,Number.parseInt(incoming.page||"1",10)||1)));
 const params={q,category,sort,color,size,min_price,max_price,page};
 const catalog=await fetchCatalog(params);
 const products=catalog.items;
 const pages=Math.max(1,Math.ceil(catalog.total/catalog.page_size));
 const link=(patch:Partial<CatalogParams>)=>{
  const next={...params,...patch};
  const query=new URLSearchParams();
  for(const [k,v] of Object.entries(next)){if(v&&v!=="newest"&&(k!=="page"||v!=="1"))query.set(k,v)}
  return "/shop"+(query.size?"?"+query.toString():"");
 };
 return <div className="shop-page page-shell">
  <div className="shop-head"><span className="eyebrow">ENJOY LIFE / CỬA HÀNG</span>
   <h1>Khám phá <em>phong cách.</em></h1><p>Chọn những thiết kế phù hợp với chính bạn.</p></div>
  <div className="shop-tools-v2">
   <nav aria-label="Lọc theo loại sản phẩm" className="shop-categories">{categories.map(c=>
    <Link key={c.slug} href={link({category:c.slug,page:"1"})} className={c.slug===category?"is-active":""}
      aria-current={c.slug===category?"page":undefined}>{c.label}</Link>)}</nav>
   <form action="/shop" className="shop-controls shop-filters">
    <input type="hidden" name="category" value={category}/>
    <label htmlFor="shop-search">Tìm sản phẩm<input id="shop-search" name="q" defaultValue={q} placeholder="Tên sản phẩm, phong cách..."/></label>
    <label htmlFor="shop-color">Màu sắc<select id="shop-color" name="color" defaultValue={color}><option value="">Tất cả màu</option>
     {filters.colors.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
    <label htmlFor="shop-size">Kích thước<select id="shop-size" name="size" defaultValue={size}><option value="">Tất cả size</option>
     {filters.sizes.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label htmlFor="shop-min">Giá từ (đ)<input id="shop-min" name="min_price" type="number" min={0} max={999999999} step={1000} defaultValue={min_price} placeholder="0"/></label>
    <label htmlFor="shop-max">Giá đến (đ)<input id="shop-max" name="max_price" type="number" min={0} max={999999999} step={1000} defaultValue={max_price} placeholder="Bất kỳ"/></label>
    <label htmlFor="shop-sort">Sắp xếp<select id="shop-sort" name="sort" defaultValue={sort}>
     <option value="newest">Mới nhất</option><option value="price-asc">Giá thấp đến cao</option>
     <option value="price-desc">Giá cao đến thấp</option></select></label>
    <button type="submit">LỌC SẢN PHẨM ↗</button>
    <Link className="shop-clear-filters" href="/shop">Xóa bộ lọc</Link>
   </form>
  </div>
  <div className="shop-count" role="status">{catalog.total} SẢN PHẨM PHÙ HỢP
   {pages>1&&<span> · TRANG {catalog.page}/{pages}</span>}</div>
  {products.length?<div className="products-grid shop-grid">{products.map(x=><ProductCard product={x} key={x.id}/>)}</div>
   :<div className="empty-state"><p>Không tìm thấy sản phẩm có size/màu và mức giá phù hợp, còn có thể bán.</p><Link href="/shop">Xóa bộ lọc ↗</Link></div>}
  {pages>1&&<nav className="shop-pagination" aria-label="Trang kết quả">
   {catalog.page>1&&<Link href={link({page:String(catalog.page-1)})}>← Trang trước</Link>}
   <span>Trang {catalog.page} / {pages}</span>
   {catalog.page<pages&&<Link href={link({page:String(catalog.page+1)})}>Trang sau →</Link>}
  </nav>}
 </div>;
}
