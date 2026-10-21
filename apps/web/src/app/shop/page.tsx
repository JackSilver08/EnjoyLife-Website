import Link from "next/link";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
export const metadata = { title: "Cửa hàng" };
export default async function Shop({searchParams}: {searchParams: Promise<{q?: string}>}) {
  const {q=""} = await searchParams;
  const products = await fetchProducts(q);
  return <div className="shop-page page-shell"><div className="shop-head"><span className="eyebrow">ENJOY LIFE / BỘ SƯU TẬP</span><h1>Khám phá<br/><em>tuyển chọn.</em></h1><p>Những món đồ để bạn tận hưởng từng ngày theo cách riêng.</p></div>
    <div className="shop-toolbar"><form action="/shop" className="shop-search"><label htmlFor="q">TÌM KIẾM</label><input id="q" name="q" defaultValue={q} placeholder="Tên sản phẩm hoặc bộ sưu tập..."/><button type="submit">TÌM KIẾM ↗</button></form><span>{products.length} SẢN PHẨM</span></div>
    {products.length ? <div className="products-grid shop-grid">{products.map((p,i)=><ProductCard key={p.id} product={p} index={i}/>)}</div> : <div className="empty-state">Chưa có sản phẩm phù hợp hoặc API chưa sẵn sàng. <Link href="/shop">Xem tất cả ↗</Link></div>}
  </div>;
}
