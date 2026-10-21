import Link from "next/link";
import { ArrowUpRight, MoveDownRight, Sparkles } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
export default async function HomePage() {
  const products = await fetchProducts();
  return <>
    <section className="hero-editorial">
      <div className="hero-photo" role="img" aria-label="Hình ảnh thời trang nghệ thuật mang phong cách hiện đại"/>
      <div className="hero-scrim"/>
      <div className="hero-topline"><span>NGHỆ THUẬT CỦA NHỊP SỐNG MỖI NGÀY</span><span>BỘ SƯU TẬP / 001 — 2026</span></div>
      <div className="hero-content"><p>ÍT HƠN VỀ THỜI TRANG. NHIỀU HƠN VỀ BẠN.</p><h1>Sống theo<br/><em>nhịp riêng.</em></h1><Link href="/shop" className="button-ivory">KHÁM PHÁ BỘ SƯU TẬP <ArrowUpRight size={17}/></Link></div>
      <div className="hero-bottom"><span>TẬN HƯỞNG NHỮNG ĐIỀU NHỎ BÉ — TỪ 2026</span><span>CUỘN ĐỂ KHÁM PHÁ ↓</span></div>
    </section>
    <section className="manifesto page-shell home-reveal"><span className="eyebrow">01 / TRIẾT LÝ CỦA CHÚNG TÔI</span><div><h2>Không chỉ là điều bạn mặc.<br/><em>Mà là cách bạn sống.</em></h2><div className="manifesto-bottom"><p>Enjoy Life được tạo ra cho những ngày bình thường nhưng đáng nhớ. Những thiết kế dễ mặc, tự do và đúng nhịp sống của riêng bạn.</p><Link className="text-link" href="/about">CÂU CHUYỆN CỦA CHÚNG TÔI <ArrowUpRight size={17}/></Link></div></div></section>
    <section className="collection-section home-reveal"><div className="section-heading page-shell"><div><span className="eyebrow">02 / TUYỂN CHỌN CHO BẠN</span><h2>Những mảnh ghép<br/><em>của cuộc sống.</em></h2></div><Link className="text-link" href="/shop">KHÁM PHÁ TẤT CẢ <ArrowUpRight size={17}/></Link></div><div className="editorial-grid page-shell"><Link href="/shop" className="editorial-tile tile-tall"><div className="tile-photo tile-one"/><div className="tile-caption"><span>01 / PHỐI ĐỒ MỖI NGÀY</span><h3>Bình thường<br/>mà thật đẹp.</h3><ArrowUpRight/></div></Link><Link href="/shop" className="editorial-tile tile-short"><div className="tile-photo tile-two"/><div className="tile-caption"><span>02 / CÂU CHUYỆN PHỐ THỊ</span><h3>Đi theo<br/>cách của bạn.</h3><ArrowUpRight/></div></Link></div></section>
    <section className="arrivals page-shell home-reveal"><div className="section-heading"><div><span className="eyebrow">03 / LỰA CHỌN NỔI BẬT</span><h2>Bộ sưu tập<br/><em>hiện tại.</em></h2></div><Link className="text-link" href="/shop">XEM TẤT CẢ <ArrowUpRight size={17}/></Link></div>{products.length ? <div className="products-grid">{products.slice(0,4).map((p,i)=><ProductCard key={p.id} product={p} index={i}/>)}</div> : <div className="empty-state">Đang kết nối danh mục sản phẩm. Hãy kiểm tra Go API và PostgreSQL.</div>}</section>
    <section className="statement home-reveal"><span className="eyebrow">LỜI NHẮN CHO BẢN THÂN / 004</span><h2>Mặc theo cách<br/><em>bạn muốn nói.</em></h2><div className="statement-bottom"><span>PHONG CÁCH CỦA BẠN. CÂU CHUYỆN CỦA BẠN. CUỘC SỐNG CỦA BẠN.</span><MoveDownRight size={30}/></div></section>
    <section className="ai-feature page-shell home-reveal"><div className="ai-symbol"><Sparkles size={42} strokeWidth={1}/></div><div><span className="eyebrow">05 / DÀNH CHO NHỮNG KHOẢNH KHẮC CỦA BẠN</span><h2>Một chút gợi ý<br/>để tìm <em>đúng chất bạn.</em></h2><p>Trợ lý thời trang thông minh của Enjoy Life sẽ giúp bạn lựa chọn theo phong cách, ngân sách và những mẫu còn sẵn trong kho.</p><span className="ai-status">TRỢ LÝ AI / ĐANG PHÁT TRIỂN</span></div><ArrowUpRight className="ai-arrow" size={38}/></section>
    <section className="last-banner home-reveal"><div><span>MỖI NGÀY, THEO CÁCH CỦA BẠN.</span><h2>Enjoy Life<span>®</span></h2><Link href="/shop">KHÁM PHÁ PHONG CÁCH CỦA BẠN <ArrowUpRight size={17}/></Link></div></section>
  </>;
}
