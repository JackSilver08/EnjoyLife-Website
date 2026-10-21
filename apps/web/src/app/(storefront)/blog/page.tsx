import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { JournalConcepts } from "@/components/journal-concepts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enjoy Journal — Cảm hứng thời trang",
  description: "Enjoy Journal: không gian cảm hứng về cách mặc, cách sống và thời trang mỗi ngày.",
  // No public CMS articles yet. Remove noindex after publishing actual content.
  robots: { index: false, follow: true },
};

export default function BlogPage() {
  return <div className="journal-page">
    <div className="page-shell">
      <div className="journal-page-head">
        <span className="eyebrow">ENJOY LIFE / JOURNAL</span>
        <h1>Chuyện <em>thời trang.</em></h1>
        <p>Một không gian dành cho cảm hứng, phong cách và những lựa chọn khiến bạn thấy thoải mái là chính mình.</p>
      </div>
      <div className="journal-status" role="status">
        <strong>Enjoy Journal đang chuẩn bị ra mắt.</strong>
        <p>Đây là những chủ đề nội dung dự kiến. Khi hệ thống quản trị bài viết hoàn thiện, các bài được xuất bản sẽ xuất hiện tại đây.</p>
      </div>
      <JournalConcepts/>
      <div className="journal-bottom-nav">
        <Link className="text-link" href="/"><ArrowLeft size={16} aria-hidden="true"/> VỀ TRANG CHỦ</Link>
        <Link className="text-link" href="/shop">KHÁM PHÁ THIẾT KẾ <ArrowUpRight size={16} aria-hidden="true"/></Link>
      </div>
    </div>
  </div>;
}
