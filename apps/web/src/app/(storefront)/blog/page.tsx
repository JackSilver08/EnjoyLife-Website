import Link from "next/link";
import type {Metadata} from "next";
import {ArrowLeft,ArrowUpRight} from "lucide-react";
import {getJournalTaxonomy,getPublishedArticles,PAGE_SIZE} from "@/lib/journal-api";
import {JournalGrid} from "@/components/journal-grid";
import {canonical,mayIndex} from "@/lib/site-url";

export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Enjoy Journal — Cảm hứng thời trang",
 description:"Những câu chuyện thời trang, phong cách sống và bí quyết phối đồ từ Enjoy Life.",
 alternates:{canonical:canonical("/blog")},
 robots:{index:mayIndex(),follow:true},
 openGraph:{title:"Enjoy Journal | Enjoy Life",description:"Góc cảm hứng thời trang và phong cách mỗi ngày.",url:canonical("/blog"),type:"website"},
};

type Filter={page?:string;category?:string;tag?:string};
const safeSlug=(s:string)=>s.length<=80&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)?s:"";
export default async function BlogPage({searchParams}:{searchParams:Promise<Filter>}){
 const params=await searchParams;
 const requested=Number(params.page||"1");
 const page=Number.isSafeInteger(requested)&&requested>0&&requested<=1112?requested:1;
 const category=safeSlug(params.category||"");
 const tag=safeSlug(params.tag||"");
 const offset=Math.min(10000,(page-1)*PAGE_SIZE);
 const [result,taxonomy]=await Promise.all([
  getPublishedArticles({limit:PAGE_SIZE,offset,category,tag}),
  getJournalTaxonomy(),
 ]);
 const totalPages=Math.max(1,Math.ceil(result.total/PAGE_SIZE));
 const href=(nextPage:number,c=category,t=tag)=>{
  const search=new URLSearchParams();
  if(c)search.set("category",c);
  if(t)search.set("tag",t);
  if(nextPage>1)search.set("page",String(nextPage));
  const str=search.toString();
  return "/blog"+(str?"?"+str:"");
 };
 return <div className="journal-page">
  <div className="page-shell">
   <header className="journal-page-head">
    <span className="eyebrow">ENJOY LIFE / JOURNAL</span>
    <h1>Chuyện <em>thời trang.</em></h1>
    <p>Những góc nhìn về cách mặc, cách sống và cảm hứng mỗi ngày. Tất cả nội dung được cập nhật từ Enjoy Journal.</p>
   </header>
   <div className="journal-filters">
    <nav aria-label="Danh mục bài viết" className="journal-categories">
      <Link href={href(1,"",tag)} aria-current={!category?"page":undefined} className={!category?"selected":""}>Tất cả</Link>
      {taxonomy.categories.map(c=><Link key={c.slug} href={href(1,c.slug,tag)}
       aria-current={category===c.slug?"page":undefined} className={category===c.slug?"selected":""}>{c.name}</Link>)}
    </nav>
    {taxonomy.tags.length>0&&<nav aria-label="Lọc bài viết theo thẻ" className="journal-tag-filter">
      <span>CHỦ ĐỀ:</span>
      <Link href={href(1,category,"")} aria-current={!tag?"page":undefined} className={!tag?"selected":""}>Tất cả</Link>
      {taxonomy.tags.slice(0,16).map(t=><Link key={t.slug} href={href(1,category,t.slug)}
        aria-current={tag===t.slug?"page":undefined} className={tag===t.slug?"selected":""}>#{t.name}</Link>)}
    </nav>}
   </div>
   <p className="journal-result-count" role="status">{result.total} BÀI VIẾT {category||tag?"PHÙ HỢP":"ĐÃ XUẤT BẢN"}</p>
   {result.items.length
    ?<JournalGrid items={result.items}/>
    :<div className="journal-empty">
      <span>ENJOY JOURNAL / {String(page).padStart(2,"0")}</span>
      <h2>{category||tag||page>1?"Chưa tìm thấy bài phù hợp.":"Những câu chuyện đang được chuẩn bị."}</h2>
      <p>{category||tag||page>1?"Thử chọn một chủ đề khác để tiếp tục khám phá.":"Enjoy Life sẽ cập nhật bài viết ngay khi được biên tập và xuất bản."}</p>
      <Link href="/blog" className="text-link">VỀ TẤT CẢ BÀI VIẾT <ArrowUpRight size={15}/></Link>
    </div>}
   {result.total>PAGE_SIZE&&<nav aria-label="Phân trang Enjoy Journal" className="journal-pagination">
      {page>1?<Link href={href(page-1)} rel="prev"><ArrowLeft size={16}/> Trang trước</Link>:<span/>}
      <span>Trang {page} / {totalPages}</span>
      {page<totalPages&&offset+PAGE_SIZE<10000?<Link href={href(page+1)} rel="next">Trang sau <ArrowUpRight size={16}/></Link>:<span/>}
    </nav>}
   <div className="journal-bottom-nav">
     <Link className="text-link" href="/"><ArrowLeft size={16}/> TRANG CHỦ</Link>
     <Link className="text-link" href="/shop">KHÁM PHÁ CỬA HÀNG <ArrowUpRight size={16}/></Link>
   </div>
  </div>
 </div>;
}
