import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import type {BlogArticle} from "@/lib/blog-types";
import {isApprovedUrl} from "@/lib/blog-types";

export function JournalCard({article,index=0}:{article:BlogArticle;index?:number}){
 const url="/blog/"+article.slug;
 const cover=isApprovedUrl(article.cover_image_url)&&!!article.cover_image_url;
 const published=article.published_at?new Date(article.published_at):null;
 const validDate=published&&!Number.isNaN(published.getTime());
 return <article className="journal-article-card">
  <Link href={url} className="journal-article-visual" aria-label={article.title}>
   {cover
    // Native img intentionally supports HTTPS URLs from the approved CMS source; storage provider may vary.
    // eslint-disable-next-line @next/next/no-img-element
    ?<img loading={index<3?"eager":"lazy"} src={article.cover_image_url} alt={article.cover_image_alt||article.title}/>
    :<span className="journal-article-placeholder" aria-hidden="true"><span>ENJOY JOURNAL</span><strong>{article.title}</strong></span>}
   <span className="journal-card-counter">{String(index+1).padStart(2,"0")} / JOURNAL</span>
  </Link>
  <div className="journal-article-meta">
   <span>{article.category_slug?article.category_slug.replaceAll("-"," "):"ENJOY LIFE"}</span>
   {validDate&&<time dateTime={article.published_at!}>{new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}).format(published)}</time>}
  </div>
  <h3><Link href={url}>{article.title}</Link></h3>
  <p>{article.excerpt}</p>
  <Link href={url} className="journal-card-read">ĐỌC BÀI VIẾT <ArrowUpRight size={16} aria-hidden="true"/></Link>
 </article>;
}
