import Link from "next/link";
import { ArrowDown, ArrowUpRight, Mail } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import { JournalConcepts } from "@/components/journal-concepts";

export default async function HomePage() {
  const products = await fetchProducts();
  const contactEmail = process.env.CONTACT_EMAIL?.trim();
  const emailAvailable = !!contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);

  return <>
    <section className="hero-editorial" aria-label="Chiến dịch thời trang Enjoy Life">
      <div className="hero-photo" role="img" aria-label="Hình ảnh thời trang đường phố"/>
      <div className="hero-scrim"/>
      <div className="hero-topline">
        <span>THỜI TRANG CHO NHỮNG NGÀY RIÊNG CỦA BẠN</span>
        <span>ENJOY LIFE / EDITORIAL</span>
      </div>
      <div className="hero-content">
        <p>PHONG CÁCH ĐƯỢC ĐỊNH NGHĨA BỞI BẠN</p>
        <h1>Sống theo<br/><em>nhịp riêng.</em></h1>
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
          <div className="home-story-photo" role="img" aria-label="Cảm hứng thời trang và lối sống hiện đại">
            <span>THE EVERYDAY EDIT / ENJOY LIFE</span>
          </div>
          <div className="home-story-copy">
            <span className="eyebrow">MỘT LỐI SỐNG / MỘT CÁ TÍNH</span>
            <h2 id="story-title">Không chỉ là<br/>điều bạn mặc.<br/><em>Mà là cách bạn sống.</em></h2>
            <p>Có những ngày bạn muốn nổi bật, cũng có những ngày chỉ cần thật thoải mái. Enjoy Life tin rằng phong cách không bắt đầu từ những quy tắc cứng nhắc — mà từ những lựa chọn khiến bạn thấy là chính mình.</p>
            <p>Chúng tôi muốn mỗi món đồ đều có thể đi cùng bạn trong những khoảnh khắc bình thường, theo một cách thật riêng.</p>
            <Link href="#featured-products" className="text-link">KHÁM PHÁ NHỮNG LỰA CHỌN <ArrowDown size={15} aria-hidden="true"/></Link>
          </div>
        </div>
        <div className="home-story-transition">
          <span>PHONG CÁCH LÀ MỘT HÀNH TRÌNH.</span>
          <span>VÀ ĐÂY LÀ ĐIỂM BẮT ĐẦU CỦA BẠN. <ArrowDown size={16} aria-hidden="true"/></span>
        </div>
      </div>
    </section>

    <section id="brand-values" className="home-values page-shell" aria-labelledby="values-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">02 / GIÁ TRỊ ENJOY LIFE</span>
          <h2 id="values-title">Điều chúng tôi <em>tin tưởng.</em></h2>
        </div>
      </div>
      <div className="values-grid">
        <div className="value-item">
          <div className="value-number">01</div>
          <h3>Thoải mái là đẹp</h3>
          <p>Phong cách bắt đầu từ sự tự tin, không phải quy tắc. Khi bạn thoải mái, mọi thứ bạn mặc đều trở nên đẹp hơn.</p>
        </div>
        <div className="value-item">
          <div className="value-number">02</div>
          <h3>Chất lượng bền bỉ</h3>
          <p>Chọn chất liệu tốt để mỗi món đồ đi cùng bạn lâu hơn. Không chạy theo số lượng, mà đầu tư vào giá trị.</p>
        </div>
        <div className="value-item">
          <div className="value-number">03</div>
          <h3>Phong cách riêng</h3>
          <p>Không theo trend, chỉ theo nhịp sống của bạn. Enjoy Life tôn trọng sự khác biệt trong mỗi lựa chọn.</p>
        </div>
      </div>
    </section>

    <section id="featured-products" className="arrivals home-products page-shell" aria-labelledby="featured-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">03 / NHỮNG LỰA CHỌN ĐÁNG KHÁM PHÁ</span>
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

    <section id="lookbook" className="home-lookbook" aria-labelledby="lookbook-title">
      <div className="page-shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow">04 / PHONG CÁCH EDITORIAL</span>
            <h2 id="lookbook-title">Câu chuyện <em>qua trang phục.</em></h2>
            <p className="home-section-subtitle">Những khoảnh khắc được kể bằng phong cách — không cần lời nói.</p>
          </div>
        </div>
        <div className="lookbook-grid">
          <div className="lookbook-tile lookbook-tile-tall">
            <div className="lookbook-tile-bg" style={{backgroundImage:"url('https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200&q=85')"}} role="img" aria-label="Phong cách nhẹ nhàng và tự do"/>
            <div className="lookbook-caption">
              <span>SPRING / SUMMER</span>
              <h3>Nhẹ nhàng và tự do.</h3>
            </div>
          </div>
          <div className="lookbook-tile lookbook-tile-short">
            <div className="lookbook-tile-bg" style={{backgroundImage:"url('https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&q=85')"}} role="img" aria-label="Bình thường mà khác biệt"/>
            <div className="lookbook-caption">
              <span>EVERYDAY EDIT</span>
              <h3>Bình thường mà khác biệt.</h3>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="home-brand-quote" aria-label="Câu nói thương hiệu Enjoy Life">
      <div className="brand-quote-inner">
        <span className="eyebrow">ENJOY LIFE / TRIẾT LÝ</span>
        <p className="brand-quote-text">&ldquo;Mặc đẹp không cần cố.<br/><em>Chỉ cần là bạn.</em>&rdquo;</p>
        <p className="brand-quote-author">— ENJOY LIFE</p>
      </div>
      <div className="brand-quote-marquee" aria-hidden="true">
        <div className="brand-quote-marquee-track">
          <span>ENJOY THE EVERYDAY</span><span>·</span>
          <span>SỐNG THEO NHỊP RIÊNG</span><span>·</span>
          <span>PHONG CÁCH LÀ BẠN</span><span>·</span>
          <span>THOẢI MÁI LÀ ĐẸP</span><span>·</span>
          <span>ENJOY THE EVERYDAY</span><span>·</span>
          <span>SỐNG THEO NHỊP RIÊNG</span><span>·</span>
          <span>PHONG CÁCH LÀ BẠN</span><span>·</span>
          <span>THOẢI MÁI LÀ ĐẸP</span><span>·</span>
        </div>
      </div>
    </section>

    <section id="journal" className="home-journal" aria-labelledby="journal-title">
      <div className="page-shell">
        <div className="section-heading">
          <div>
            <span className="eyebrow">05 / ENJOY JOURNAL</span>
            <h2 id="journal-title">Chuyện <em>thời trang.</em></h2>
            <p className="home-section-subtitle">Những góc nhìn về cách mặc, cách sống và cảm hứng mỗi ngày.</p>
          </div>
          <Link href="/blog" className="text-link">KHÁM PHÁ JOURNAL <ArrowUpRight size={16} aria-hidden="true"/></Link>
        </div>
        <p className="journal-preview-disclaimer">Enjoy Journal đang chuẩn bị ra mắt. Dưới đây là các chủ đề dự kiến, chưa phải bài viết đã xuất bản.</p>
        <JournalConcepts compact/>
      </div>
    </section>

    <section id="community" className="home-community page-shell" aria-labelledby="community-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">06 / CỘNG ĐỒNG ENJOY LIFE</span>
          <h2 id="community-title">Cùng Enjoy Life <em>mỗi ngày.</em></h2>
          <p className="home-section-subtitle">Chia sẻ phong cách của bạn cùng cộng đồng Enjoy Life.</p>
        </div>
      </div>
      <div className="community-grid">
        <div className="community-item">
          <div className="community-item-bg" style={{backgroundImage:"url('https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80')"}} role="img" aria-label="Street style"/>
          <div className="community-overlay"><span>@ENJOYLIFE</span></div>
        </div>
        <div className="community-item">
          <div className="community-item-bg" style={{backgroundImage:"url('https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&q=80')"}} role="img" aria-label="Fashion portrait"/>
          <div className="community-overlay"><span>@ENJOYLIFE</span></div>
        </div>
        <div className="community-item">
          <div className="community-item-bg" style={{backgroundImage:"url('https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80')"}} role="img" aria-label="Phong cách đường phố"/>
          <div className="community-overlay"><span>@ENJOYLIFE</span></div>
        </div>
        <div className="community-item">
          <div className="community-item-bg" style={{backgroundImage:"url('https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=800&q=80')"}} role="img" aria-label="Shopping & lifestyle"/>
          <div className="community-overlay"><span>@ENJOYLIFE</span></div>
        </div>
      </div>
      <div className="community-cta">
        <p>Theo dõi Enjoy Life để cập nhật những bộ sưu tập mới nhất và cảm hứng phong cách mỗi ngày.</p>
        <Link href="/shop" className="text-link">KHÁM PHÁ CỬA HÀNG <ArrowUpRight size={16} aria-hidden="true"/></Link>
      </div>
    </section>

    <section id="contact" className="home-contact" aria-labelledby="contact-title">
      <div className="page-shell home-contact-layout">
        <div><span className="eyebrow">07 / KẾT NỐI VỚI ENJOY LIFE</span><h2 id="contact-title">Có điều muốn nói?<br/><em>Hãy kết nối.</em></h2></div>
        <div className="home-contact-details">
          <p>Cần tìm hiểu thêm về trang phục, đơn hàng hay các chính sách mua sắm? Hãy để Enjoy Life đồng hành cùng bạn.</p>
          {emailAvailable ? (
            <a href={`mailto:${contactEmail}`} className="contact-primary">GỬI EMAIL CHO CHÚNG TÔI <Mail size={17} aria-hidden="true"/></a>
          ) : (
            <Link href="/contact" className="contact-primary">THÔNG TIN LIÊN HỆ <ArrowUpRight size={17} aria-hidden="true"/></Link>
          )}
          <Link className="contact-secondary" href="/policies">CHÍNH SÁCH GIAO HÀNG & ĐỔI TRẢ <ArrowUpRight size={15} aria-hidden="true"/></Link>
        </div>
      </div>
    </section>
  </>;
}
