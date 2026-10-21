import Link from "next/link";
export default function JournalNotFound(){
 return <section className="page-shell journal-not-found">
  <span className="eyebrow">ENJOY JOURNAL / 404</span>
  <h1>Câu chuyện không còn ở đây.</h1>
  <p>Bài viết chưa được xuất bản, đã được gỡ hoặc đường dẫn không tồn tại.</p>
  <Link className="text-link" href="/blog">TRỞ VỀ ENJOY JOURNAL ↗</Link>
 </section>;
}
