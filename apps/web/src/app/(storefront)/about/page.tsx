import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
export const metadata={title:"Câu chuyện Enjoy Life"};
export default function About(){
  return <div className="about-page"><section className="about-hero"><span className="eyebrow">ENJOY LIFE / CÂU CHUYỆN</span><h1>Cuộc sống đẹp hơn<br/>khi bạn <em>tận hưởng nó.</em></h1></section>
    <section className="page-shell about-copy"><span className="eyebrow">PHONG CÁCH RIÊNG / MỖI NGÀY</span><div><h2>Không cần khác biệt<br/>để là <em>chính mình.</em></h2><p>Enjoy Life dành chỗ cho những lựa chọn giản dị và những khoảnh khắc bạn muốn ghi nhớ. Chúng tôi hướng tới những thiết kế dễ mặc, tự do và không bị giới hạn bởi một khuôn mẫu duy nhất.</p><p>Một tủ đồ phù hợp bắt đầu từ sự thoải mái và những gì bạn thật sự thích.</p><Link className="button-dark" href="/shop">KHÁM PHÁ SẢN PHẨM <ArrowUpRight size={17}/></Link></div></section>
  </div>;
}
