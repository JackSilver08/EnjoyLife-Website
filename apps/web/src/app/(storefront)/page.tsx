import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { JournalGrid } from "@/components/journal-grid";
import { fetchSiteContent } from "@/lib/site-content";
import { getPublishedArticles } from "@/lib/journal-api";

export default async function HomePage() {
  const [products, journal, content] = await Promise.all([
    fetchProducts(),
    getPublishedArticles({limit:3}).catch(()=>null),
    fetchSiteContent(),
  ]);

  return <>
    <section className="hero-editorial" aria-label="Chiến dịch thời trang Enjoy Life">
      <div className="hero-photo" role="img" aria-label="Hình ảnh thời trang đường phố" style={content?.hero_image_url?{backgroundImage:`url("${content.hero_image_url.replace(/[\\"\\\\]/g,"")}")`}:undefined}/>
      <div className="hero-scrim"/>
      <div className="hero-topline">
        <span>THỜI TRANG CHO NHỮNG NGÀY RIÊNG CỦA BẠN</span>
        <span>ENJOY LIFE / EDITORIAL</span>
      </div>
      <div className="hero-content">
        <p>{content?.hero_eyebrow??"PHONG CÁCH ĐƯỢC ĐỊNH NGHĨA BỞI BẠN"}</p>
        <h1>{content?.hero_title??"Sống theo"}<br/><em>{content?.hero_emphasis??"nhịp riêng."}</em></h1>
        <Link href="#our-story" className="button-ivory">
          KHÁM PHÁ CÂU CHUYỆN <ArrowDown size={17} aria-hidden="true"/>
        </Link>
      </div>
      <div className="hero-bottom">
        <span>ENJOY THE EVERYDAY.</span>
        <Link href="#our-story" aria-label="Cuộn xuống câu chuyện Enjoy Life">CUỘN ĐỂ KHÁM PHÁ <ArrowDown size={13} aria-hidden="true"/></Link>
      </div>
    </section>

    <section id="our-story" className="home-story" aria-labelledby="story-title">
      <div className="page-shell">
        <div className="home-story-heading">
          <span className="eyebrow">01 / CÂU CHUYỆN ENJOY LIFE</span>
          <p>KHÔNG CHỈ LÀ TRANG PHỤC, MÀ CÒN LÀ CẢM GIÁC KHI BẠN MẶC NÓ.</p>
        </div>
        <div className="home-story-layout">
          <div className="home-story-photo" role="img" aria-label="Cảm hứng thời trang và lối sống hiện đại" style={content?.story_image_url?{backgroundImage:`url("${content.story_image_url.replace(/[\\"\\\\]/g,"")}")`}:undefined}>
            <span>THE EVERYDAY EDIT / ENJOY LIFE</span>
          </div>
          <div className="home-story-copy">
            <span className="eyebrow">{content?.story_eyebrow??"MỘT LỐI SỐNG / MỘT CÁ TÍNH"}</span>
            <h2 id="story-title">{content?.story_title??"Không chỉ là điều bạn mặc."}<br/><em>{content?.story_emphasis??"Mà là cách bạn sống."}</em></h2>
            <p>{content?.story_p1??"Phong cách không bắt đầu từ những quy tắc cứng nhắc."}</p>
            <p>{content?.story_p2??"Mỗi món đồ đi cùng bạn theo một cách thật riêng."}</p>
            <Link href="#featured-products" className="text-link">KHÁM PHÁ NHỮNG LỰA CHỌN <ArrowDown size={15} aria-hidden="true"/></Link>
          </div>
        </div>
        <div className="home-story-transition">
          <span>PHONG CÁCH LÀ MỘT HÀNH TRÌNH.</span>
          <span>VÀ ĐÂY LÀ ĐIỂM BẮT ĐẦU CỦA BẠN. <ArrowDown size={16} aria-hidden="true"/></span>
        </div>
      </div>
    </section>

    <section id="featured-products" className="arrivals home-products page-shell" aria-labelledby="featured-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">02 / NHỮNG LỰA CHỌN ĐÁNG KHÁM PHÁ</span>
          <h2 id="featured-title">Mặc đẹp <em>mỗi ngày.</em></h2>
          <p className="home-section-subtitle">Những thiết kế đang có tại Enjoy Life, dành cho nhịp sống của bạn.</p>
        </div>
        <Link className="text-link" href="/shop">XEM TẤT CẢ SẢN PHẨM <ArrowUpRight size={16} aria-hidden="true"/></Link>
      </div>
      {products.length > 0
        ? <div className="products-grid">{products.slice(0, 4).map(product => (
            <ProductCard key={product.id} product={product}/>
          ))}</div>
        : <div className="empty-state">Cửa hàng đang cập nhật các sản phẩm mới. <Link href="/shop">Đến cửa hàng ↗</Link></div>}
    </section>

    <section id="journal" className="home-journal" aria-labelledby="journal-title">
      <div className="page-shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow">03 / ENJOY JOURNAL</span>
            <h2 id="journal-title">Chuyện <em>thời trang.</em></h2>
            <p className="home-section-subtitle">Những góc nhìn về cách mặc, cách sống và cảm hứng mỗi ngày.</p>
          </div>
          <Link href="/blog" className="text-link">KHÁM PHÁ JOURNAL <ArrowUpRight size={16} aria-hidden="true"/></Link>
        </div>
        {journal===null
          ? <div className="journal-home-empty"><p>Chưa tải được tin tức lúc này.</p><Link href="/blog" className="text-link">THỬ XEM JOURNAL <ArrowUpRight size={15}/></Link></div>
          : journal.items.length
          ? <JournalGrid items={journal.items}/>
          : <div className="journal-home-empty"><p>Những câu chuyện thời trang đang được biên tập. Hẹn gặp bạn tại Enjoy Journal.</p><Link href="/blog" className="text-link">KHÁM PHÁ JOURNAL <ArrowUpRight size={15}/></Link></div>}
      </div>
    </section>

    <section id="contact" className="home-contact" aria-labelledby="contact-title">
      <div className="page-shell home-contact-layout">
        <div><span className="eyebrow">04 / KẾT NỐI VỚI ENJOY LIFE</span><h2 id="contact-title">Có điều muốn nói?<br/><em>Hãy kết nối.</em></h2></div>
        <div className="home-contact-details">
          <p>Cần tìm hiểu thêm về trang phục, đơn hàng hay các chính sách mua sắm? Hãy để Enjoy Life đồng hành cùng bạn.</p>
          <ContactForm/>
          <Link className="contact-secondary" href="/policies">CHÍNH SÁCH GIAO HÀNG & ĐỔI TRẢ <ArrowUpRight size={15} aria-hidden="true"/></Link>
        </div>
      </div>
    </section>
  </>;
}
