import Link from "next/link";
import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {ArrowLeft,ArrowUpRight} from "lucide-react";
import {BlogContentPreview} from "@/components/admin/blog-content-preview";
import {getPublishedArticle,getPublishedArticles} from "@/lib/journal-api";
import {isApprovedUrl} from "@/lib/blog-types";
import {JournalGrid} from "@/components/journal-grid";
import {canonical,mayIndex} from "@/lib/site-url";

export const dynamic="force-dynamic";
type Props={params:Promise<{slug:string}>};

export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;
 const article=await getPublishedArticle(slug);
 if(!article)return {title:"Không tìm thấy bài viết",robots:{index:false,follow:false}};
 const title=article.seo_title||article.title;
 const description=article.seo_description||article.excerpt;
 const url=canonical("/blog/"+article.slug);
 const image=isApprovedUrl(article.og_image_url)&&article.og_image_url
  ?article.og_image_url
  :isApprovedUrl(article.cover_image_url)&&article.cover_image_url
  ?article.cover_image_url:undefined;
 return {
  title,description,
  alternates:{canonical:url},
  robots:{index:mayIndex(),follow:true},
  openGraph:{type:"article",title,description,url,
    publishedTime:article.published_at??undefined,modifiedTime:article.updated_at,
    images:image?[{url:image,alt:article.cover_image_alt||article.title}]:undefined},
  twitter:{card:image?"summary_large_image":"summary",title,description,
    images:image?[image]:undefined},
 };
}

export default async function BlogArticlePage({params}:Props){
 const {slug}=await params;
 const article=await getPublishedArticle(slug);
 if(!article)notFound();
 // Recommendations come exclusively from the published-only API.
 let related:Awaited<ReturnType<typeof getPublishedArticles>>["items"]=[];
 try{
  const result=await getPublishedArticles({limit:4,category:article.category_slug});
  related=result.items.filter(a=>a.id!==article.id).slice(0,3);
 }catch{
  // A failed secondary recommendation query must never hide the article itself.
 }
 const image=isApprovedUrl(article.cover_image_url)&&!!article.cover_image_url;
 const date=article.published_at?new Date(article.published_at):null;
 const published=date&&!Number.isNaN(date.getTime());
 const url=canonical("/blog/"+article.slug);
 const schema={
  "@context":"https://schema.org","@type":"BlogPosting",
  headline:article.title,description:article.seo_description||article.excerpt,
  mainEntityOfPage:{"@type":"WebPage","@id":url},url,
  datePublished:article.published_at,dateModified:article.updated_at,
  author:{"@type":"Organization",name:"Enjoy Life"},
  publisher:{"@type":"Organization",name:"Enjoy Life"},
  ...(image?{image:[article.cover_image_url]}:{}),
  ...(article.tag_slugs?.length?{keywords:article.tag_slugs.join(", ")}:{}),
 };
 return <article className="journal-detail">
  <script type="application/ld+json" dangerouslySetInnerHTML={{
   __html:JSON.stringify(schema).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026"),
  }}/>
  <div className="page-shell journal-article-shell">
    <nav className="journal-detail-back" aria-label="Điều hướng bài viết">
      <Link href="/blog"><ArrowLeft size={16}/> ENJOY JOURNAL</Link>
      <span>{article.category_slug?article.category_slug.replaceAll("-"," "):"CÂU CHUYỆN"}</span>
    </nav>
    <header className="journal-detail-heading">
      <span className="eyebrow">ENJOY LIFE / JOURNAL</span>
      <h1>{article.title}</h1>
      <p>{article.excerpt}</p>
      <div className="journal-detail-byline"><strong>ENJOY LIFE</strong>
        {published&&<time dateTime={article.published_at!}>{new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"long",year:"numeric"}).format(date)}</time>}
      </div>
    </header>
    {image&&<figure className="journal-detail-hero">
      {/* URL comes from the HTTPS-only CMS; native img supports arbitrary verified media hosts. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={article.cover_image_url} alt={article.cover_image_alt||article.title} fetchPriority="high"/>
      {article.cover_image_alt&&<figcaption>{article.cover_image_alt}</figcaption>}
    </figure>}
    <div className="journal-detail-body">
      {article.content_json&&<BlogContentPreview content={article.content_json}/>}
      {article.tag_slugs.length>0&&<div className="journal-detail-tags"><span>CHỦ ĐỀ</span>
        {article.tag_slugs.map(t=><Link key={t} href={"/blog?tag="+encodeURIComponent(t)}>#{t.replaceAll("-"," ")}</Link>)}
      </div>}
      <div className="journal-detail-after"><span>ENJOY THE EVERYDAY.</span>
        <Link href="/blog">ĐỌC THÊM CÂU CHUYỆN <ArrowUpRight size={15}/></Link>
      </div>
    </div>
  </div>
  {related.length>0&&<section className="journal-related"><div className="page-shell">
    <div className="section-heading"><div><span className="eyebrow">TIẾP TỤC KHÁM PHÁ</span><h2>Có thể bạn <em>quan tâm.</em></h2></div>
      <Link href="/blog" className="text-link">TẤT CẢ BÀI VIẾT <ArrowUpRight size={16}/></Link></div>
    <JournalGrid items={related}/>
  </div></section>}
 </article>;
}
