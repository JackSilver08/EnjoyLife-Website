import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Mail } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liên hệ Enjoy Life",
  description: "Kết nối với Enjoy Life và tìm hiểu thông tin hỗ trợ mua sắm.",
  robots: { index: false, follow: true },
};

export default function ContactPage() {
  const configuredEmail = process.env.CONTACT_EMAIL?.trim() ?? "";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail) ? configuredEmail : "";

  return <div className="contact-page">
    <section className="page-shell contact-page-main">
      <span className="eyebrow">ENJOY LIFE / LIÊN HỆ</span>
      <h1>Chúng mình<br/><em>lắng nghe bạn.</em></h1>
      <p>Góp ý về trải nghiệm mua sắm, cần hỗ trợ chọn sản phẩm hoặc thông tin giao hàng? Kết nối với Enjoy Life theo kênh được cửa hàng xác nhận.</p>
      {email ? <a className="button-dark" href={`mailto:${email}`}>
        GỬI EMAIL <Mail size={18} aria-hidden="true"/>
      </a> : <div className="contact-pending">
        <strong>Kênh liên hệ trực tiếp đang được cập nhật.</strong>
        <p>Enjoy Life chưa công bố email/hotline chính thức trên website. Chúng tôi sẽ bổ sung ngay sau khi cửa hàng xác nhận thông tin liên hệ.</p>
      </div>}
      <div className="contact-page-links">
        <Link className="text-link" href="/policies">CHÍNH SÁCH MUA HÀNG <ArrowUpRight size={16} aria-hidden="true"/></Link>
        <Link className="text-link" href="/"><ArrowLeft size={16} aria-hidden="true"/> TRANG CHỦ</Link>
      </div>
    </section>
  </div>;
}
