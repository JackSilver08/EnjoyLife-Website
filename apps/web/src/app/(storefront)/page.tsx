import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
export default async function HomePage() {
  const products=await fetchProducts();
  return <>
    <section className="hero-editorial" aria-label="Bộ sưu tập thời trang Enjoy Life">
      <div className="hero-photo" role="img" aria-label="Hình ảnh chiến dịch thời trang đường phố"/>
      <div className="hero-scrim"/>
      <div className="hero-topline"><span>THỜI TRANG CHO NHỮNG NGÀY RIÊNG CỦA BẠN</span><span>ENJOY LIFE / EDITORIAL</span></div>
      <div className="hero-content"><p>PHONG CÁCH ĐƯỢC ĐỊNH NGHĨA BỞI BẠN</p><h1>Sống theo<br/><em>nhịp riêng.</em></h1><Link href="/shop" className="button-ivory">KHÁM PHÁ CỬA HÀNG <ArrowUpRight size={17}/></Link></div>
      <div className="hero-bottom"><span>ENJOY THE EVERYDAY.</span><span>CUỘN ĐỂ KHÁM PHÁ ↓</span></div>
    </section>
    <section className="shop-category page-shell" aria-labelledby="category-title">
      <div className="section-heading"><div><span className="eyebrow">01 / KHÁM PHÁ THEO DANH MỤC</span><h2 id="category-title">Tìm món đồ <em>dành cho bạn.</em></h2></div><Link href="/shop" className="text-link">XEM TẤT CẢ <ArrowUpRight size={16}/></Link></div>
      <div className="category-grid">
        <Link href="/shop?category=ao" className="category-card"><span>01 / ÁO</span><strong>Những chiếc áo</strong><ArrowUpRight/></Link>
        <Link href="/shop?category=quan" className="category-card"><span>02 / QUẦN</span><strong>Thả lỏng mỗi ngày</strong><ArrowUpRight/></Link>
        <Link href="/shop?category=outerwear" className="category-card"><span>03 / ÁO KHOÁC</span><strong>Thêm một lớp cá tính</strong><ArrowUpRight/></Link>
      </div>
    </section>
    <section className="arrivals page-shell" aria-labelledby="featured-title"><div className="section-heading"><div><span className="eyebrow">02 / LỰA CHỌN NỔI BẬT</span><h2 id="featured-title">Mặc đẹp <em>mỗi ngày.</em></h2></div><Link className="text-link" href="/shop">MUA SẮM NGAY <ArrowUpRight size={16}/></Link></div>{products.length?<div className="products-grid">{products.slice(0,4).map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="empty-state">Chưa tải được sản phẩm. Vui lòng quay lại sau.</div>}</section>
    <section id="lookbook" className="collection-section" aria-labelledby="lookbook-title"><div className="section-heading page-shell"><div><span className="eyebrow">03 / CẢM HỨNG PHỐI ĐỒ</span><h2 id="lookbook-title">Một chút <em>khác biệt.</em></h2></div><Link className="text-link" href="/about">CÂU CHUYỆN ENJOY LIFE <ArrowUpRight size={16}/></Link></div><div className="editorial-grid page-shell"><Link href="/shop?category=ao" className="editorial-tile tile-tall"><div className="tile-photo tile-one"/><div className="tile-caption"><span>LOOKBOOK / 01</span><h3>Vẻ đẹp<br/>thường ngày.</h3><ArrowUpRight/></div></Link><Link href="/shop?category=outerwear" className="editorial-tile tile-short"><div className="tile-photo tile-two"/><div className="tile-caption"><span>LOOKBOOK / 02</span><h3>Đậm dấu<br/>ấn riêng.</h3><ArrowUpRight/></div></Link></div></section>
    <section className="ai-feature page-shell"><div className="ai-symbol"><Sparkles size={40} strokeWidth={1}/></div><div><span className="eyebrow">04 / PHONG CÁCH CỦA BẠN</span><h2>Chọn đồ theo <em>cách của bạn.</em></h2><p>Khám phá những thiết kế hiện có hoặc nhắn với Enjoy Life để được hỗ trợ lựa chọn. Trợ lý AI tự động sẽ được giới thiệu sau khi hoàn tất tích hợp.</p><Link className="text-link" href="/shop">KHÁM PHÁ SẢN PHẨM <ArrowUpRight size={17}/></Link></div></section>
  </>;
}
