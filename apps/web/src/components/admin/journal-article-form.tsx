"use client";

import Link from "next/link";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft,Eye,EyeOff,Save,Send,RotateCcw,ExternalLink} from "lucide-react";
import type {JSONContent} from "@tiptap/core";
import {JournalRichTextEditor} from "@/components/admin/journal-rich-text-editor";
import {MediaPicker} from "@/components/admin/media-picker";
import {BlogContentPreview} from "@/components/admin/blog-content-preview";
import {journalApi} from "@/lib/blog-api";
import {asSlug,blankBlogArticle,inputFromArticle,isApprovedUrl,
  type BlogArticle,type BlogArticleInput,type BlogCategory,type BlogTag,type BlogStatus} from "@/lib/blog-types";

export function JournalArticleForm({initial}:{initial?:BlogArticle}){
  const router=useRouter();
  const [data,setData]=useState<BlogArticleInput>(()=>initial?inputFromArticle(initial):blankBlogArticle());
  const [version,setVersion]=useState(initial?.version??0);
  const [articleId,setArticleId]=useState(initial?.id??"");
  const [categories,setCategories]=useState<BlogCategory[]>([]);
  const [tags,setTags]=useState<BlogTag[]>([]);
  const [taxonomyError,setTaxonomyError]=useState("");
  const [status,setStatus]=useState<"idle"|"saving">("idle");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [dirty,setDirty]=useState(false);
  const [preview,setPreview]=useState(false);
  const [seoOpen,setSEOOpen]=useState(true);

  useEffect(()=>{
    let active=true;
    Promise.all([journalApi.categories(),journalApi.tags()])
      .then(([cat,tag])=>{if(active){setCategories(cat.items);setTags(tag.items)}})
      .catch(e=>{if(active)setTaxonomyError(e instanceof Error?e.message:"Không tải được danh mục và tags.")});
    return()=>{active=false};
  },[]);
  useEffect(()=>{
    const guard=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue=""}};
    window.addEventListener("beforeunload",guard);
    return()=>window.removeEventListener("beforeunload",guard);
  },[dirty]);

  const isSaving=status==="saving";
  function change<K extends keyof BlogArticleInput>(key:K,value:BlogArticleInput[K]){
    setData(v=>({...v,[key]:value}));setDirty(true);setNotice("");
  }
  function changeTitle(title:string){
    setData(v=>({...v,title,slug:v.slug||asSlug(title)}));
    setDirty(true);setNotice("");
  }
  function updateDoc(doc:JSONContent){change("content_json",doc)}
  const words=useMemo(()=>{
    const walk=(node:JSONContent):string=>(node.text??"")+" "+(node.content??[]).map(walk).join(" ");
    return walk(data.content_json).trim().split(/\s+/).filter(Boolean).length;
  },[data.content_json]);

  function validate(next:BlogStatus):string{
    if(data.title.trim().length<3||data.title.length>180)return "Tiêu đề phải có từ 3 đến 180 ký tự.";
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)||data.slug.length>140||data.slug.length<3)return "Slug phải gồm chữ thường, số và dấu gạch ngang.";
    if(data.excerpt.length>450)return "Mô tả ngắn tối đa 450 ký tự.";
    if(!isApprovedUrl(data.cover_image_url)||!isApprovedUrl(data.og_image_url))return "Chỉ chấp nhận URL ảnh HTTPS hợp lệ.";
    if(data.cover_image_url&&!data.cover_image_alt.trim())return "Ảnh bìa cần mô tả alt.";
    if(data.cover_image_alt.length>200||data.seo_title.length>70||data.seo_description.length>180)return "Các trường SEO vượt giới hạn.";
    if(next==="PUBLISHED"&&(data.excerpt.trim().length<20||words<4))return "Bài xuất bản cần mô tả rõ ràng và nội dung thực, không để trống.";
    if(data.tag_slugs.length>10)return "Tối đa 10 tags.";
    return "";
  }
  async function save(next:BlogStatus){
    if(isSaving)return;
    setError("");setNotice("");
    const invalid=validate(next);
    if(invalid){setError(invalid);return}
    setStatus("saving");
    try{
      const payload={...data,status:next,...(articleId?{expected_version:version}:{})};
      const response=articleId
        ?await journalApi.update(articleId,payload)
        :await journalApi.create(payload);
      const id=articleId||response.id;
      setVersion(response.version);setArticleId(id);
      setData(v=>({...v,status:next,expected_version:response.version}));
      setDirty(false);
      setNotice(next==="PUBLISHED"?"Đã xuất bản; bài viết được cập nhật trên trang Journal công khai.":"Đã lưu bản nháp vào PostgreSQL.");
      if(!articleId)router.replace("/admin/blog/"+id+"/edit");
    }catch(e){setError(e instanceof Error?e.message:"Lỗi lưu bài viết.")}
    finally{setStatus("idle")}
  }
  async function submit(e:FormEvent){e.preventDefault();await save("DRAFT")}
  const currentStatus=data.status;
  return <div className="cms-page">
    <div className="cms-page-heading">
      <div><Link href="/admin/blog" className="cms-back"><ArrowLeft size={16}/> Danh sách bài viết</Link>
        <span className="eyebrow">ENJOY JOURNAL / BIÊN TẬP</span>
        <h1>{initial?"Chỉnh sửa bài viết":"Viết bài mới"}</h1>
        <p>{currentStatus==="PUBLISHED"?"Bài đã xuất bản. Thay đổi cần lưu lại để cập nhật.":"Lưu nháp để tiếp tục biên tập, chỉ xuất bản sau khi đã kiểm tra nội dung."}</p>
      </div>
      <span className={currentStatus==="PUBLISHED"?"cms-status is-public":"cms-status"}>{currentStatus==="PUBLISHED"?"ĐÃ XUẤT BẢN":"BẢN NHÁP"} · v{version||1}{dirty?" · Chưa lưu":""}</span>
    </div>
    {error&&<div className="admin-error" role="alert">{error}</div>}
    {notice&&<div className="admin-notice" role="status">{notice}</div>}
    {taxonomyError&&<p role="alert" className="admin-error">Không tải được danh mục/tags: {taxonomyError}</p>}
    <div className="cms-form-actions">
      <button type="button" className="cms-secondary-action" onClick={()=>setPreview(v=>!v)}>
        {preview?<EyeOff size={17}/>:<Eye size={17}/>} {preview?"Quay lại chỉnh sửa":"Xem trước"}</button>
      {currentStatus==="DRAFT"?<button type="button" className="cms-secondary-action" onClick={()=>void save("DRAFT")} disabled={isSaving}>
        <Save size={16}/> Lưu nháp</button>
       :<button type="button" className="cms-secondary-action" disabled={isSaving} onClick={()=>void save("DRAFT")}><RotateCcw size={16}/> Gỡ xuất bản</button>}
      <button type="button" className="cms-primary-action" disabled={isSaving} onClick={()=>void save("PUBLISHED")}>
        <Send size={16}/>{isSaving?"Đang lưu...":currentStatus==="PUBLISHED"?"Cập nhật bài":"Xuất bản"}</button>
    </div>
    {preview?<div className="cms-preview-shell" aria-label="Bản xem trước bài viết">
      <div className="cms-preview-banner">BẢN XEM TRƯỚC NỘI BỘ · KHÔNG PHẢI TRANG CÔNG KHAI</div>
      <span className="eyebrow">ENJOY JOURNAL / {data.category_slug||"BÀI VIẾT"}</span>
      <h2>{data.title||"Chưa có tiêu đề"}</h2>
      <p className="cms-preview-excerpt">{data.excerpt}</p>
      {data.cover_image_url&&isApprovedUrl(data.cover_image_url)&&
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cms-preview-cover" src={data.cover_image_url} alt={data.cover_image_alt}/>}
      <BlogContentPreview content={data.content_json}/>
      <div className="cms-preview-end">Bản nháp xem trước tại Admin. SEO title: {data.seo_title||data.title||"Chưa nhập"}</div>
    </div>:
    <form className="cms-editor-layout" onSubmit={(e)=>{void submit(e)}}>
      <div className="cms-main-panel">
        <section className="cms-panel">
          <label className="cms-label" htmlFor="blog-title">Tiêu đề bài viết <span>*</span></label>
          <input className="cms-title-input" id="blog-title" value={data.title} maxLength={180} placeholder="Ví dụ: Cảm hứng phối đồ mỗi ngày" onChange={e=>changeTitle(e.target.value)}/>
          <label className="cms-label" htmlFor="blog-slug">Đường dẫn SEO (slug) <span>*</span></label>
          <div className="cms-slug-input"><span>/blog/</span>
            <input id="blog-slug" value={data.slug} maxLength={140} onChange={e=>change("slug",asSlug(e.target.value))}/>
          </div>
          <label className="cms-label" htmlFor="blog-excerpt">Mô tả ngắn / tóm tắt</label>
          <textarea id="blog-excerpt" rows={3} maxLength={450} value={data.excerpt} onChange={e=>change("excerpt",e.target.value)}
            placeholder="Một đoạn giới thiệu để người đọc hiểu bài viết nói về điều gì..."/>
          <div className="cms-hint">{data.excerpt.length}/450 ký tự</div>
        </section>
        <section className="cms-panel">
          <div className="cms-panel-heading"><div><span className="eyebrow">NỘI DUNG</span><h2>Không gian biên tập</h2></div><span>{words} từ</span></div>
          <JournalRichTextEditor initial={initial?.content_json??data.content_json} onChange={updateDoc} disabled={isSaving}/>
        </section>
        <section className="cms-panel">
          <button type="button" className="cms-collapse" onClick={()=>setSEOOpen(v=>!v)} aria-expanded={seoOpen}>Thông tin SEO <span>{seoOpen?"−":"+"}</span></button>
          {seoOpen&&<div className="cms-seo-fields">
            <label className="cms-label" htmlFor="blog-seo-title">Meta Title · tối đa 70 ký tự</label>
            <input id="blog-seo-title" value={data.seo_title} maxLength={70} placeholder={data.title||"Tiêu đề hiển thị trên Google"} onChange={e=>change("seo_title",e.target.value)}/>
            <div className="cms-hint">{data.seo_title.length}/70</div>
            <label className="cms-label" htmlFor="blog-seo-description">Meta Description · tối đa 180 ký tự</label>
            <textarea id="blog-seo-description" rows={3} maxLength={180} value={data.seo_description}
              onChange={e=>change("seo_description",e.target.value)} placeholder="Đoạn mô tả ngắn xuất hiện trên kết quả tìm kiếm."/>
            <div className="cms-hint">{data.seo_description.length}/180</div>
            <label className="cms-label" htmlFor="blog-og-url">Ảnh Open Graph (HTTPS hoặc thư viện)</label>
            <input id="blog-og-url" placeholder="https://... hoặc /media/..." value={data.og_image_url} onChange={e=>change("og_image_url",e.target.value)}/>
            <MediaPicker compact label="Chọn ảnh SEO từ máy / thư viện" value={data.og_image_url} onSelect={url=>change("og_image_url",url)}/>
            <div className="cms-google-preview">
              <span>enjoylife.com / blog / {data.slug||"slug-bai-viet"}</span>
              <strong>{data.seo_title||data.title||"Tiêu đề bài viết"}</strong>
              <p>{data.seo_description||data.excerpt||"Mô tả bài viết sẽ được hiển thị tại đây."}</p>
            </div>
            <p className="cms-editor-hint">Đây là bản xem trước dữ liệu SEO. Metadata/canonical và sitemap sẽ được xuất ra frontend Blog ở Sprint 4.</p>
          </div>}
        </section>
      </div>
      <aside className="cms-side-panel">
        <section className="cms-panel">
          <span className="eyebrow">PHÂN LOẠI BÀI VIẾT</span>
          <label className="cms-label" htmlFor="blog-category">Danh mục</label>
          <select id="blog-category" value={data.category_slug} onChange={e=>change("category_slug",e.target.value)}>
            <option value="">Chưa chọn danh mục</option>
            {categories.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
          <label className="cms-label">Tags · tối đa 10</label>
          {tags.length===0?<p className="cms-editor-hint">Chưa có thẻ. Tạo ở trang danh sách bài viết.</p>:
            <div className="cms-tag-options">{tags.map(tag=><label key={tag.slug}>
              <input type="checkbox" disabled={!data.tag_slugs.includes(tag.slug)&&data.tag_slugs.length>=10}
                checked={data.tag_slugs.includes(tag.slug)}
                onChange={e=>change("tag_slugs",e.target.checked?[...data.tag_slugs,tag.slug]:data.tag_slugs.filter(s=>s!==tag.slug))}/>
              {tag.name}</label>)}</div>}
          <Link href="/admin/blog#taxonomy" className="cms-inline-link">Quản lý danh mục và tags <ExternalLink size={13}/></Link>
        </section>
        <section className="cms-panel">
          <span className="eyebrow">ẢNH BÌA</span>
          <label className="cms-label" htmlFor="blog-cover-url">Ảnh bìa từ thư viện</label>
          <MediaPicker compact label="Ảnh bìa bài viết" value={data.cover_image_url} onSelect={url=>change("cover_image_url",url)} onUpload={asset=>{if(!data.cover_image_alt)change("cover_image_alt",asset.original_name.replace(/\\.[^.]+$/,""))}}/>
          <input id="blog-cover-url" value={data.cover_image_url} onChange={e=>change("cover_image_url",e.target.value)} placeholder="https://... hoặc /media/..."/>
          <label className="cms-label" htmlFor="blog-cover-alt">Alt text cho ảnh</label>
          <input id="blog-cover-alt" value={data.cover_image_alt} maxLength={200} onChange={e=>change("cover_image_alt",e.target.value)} placeholder="Mô tả ảnh bìa"/>
          {data.cover_image_url&&isApprovedUrl(data.cover_image_url)&&
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cms-cover-thumbnail" alt={data.cover_image_alt||"Ảnh bìa thử nghiệm"} src={data.cover_image_url}/>}
          <p className="cms-editor-hint">Chọn tệp JPG/PNG/WebP trên máy hoặc sử dụng ảnh đã có trong thư viện.</p>
        </section>
        <section className="cms-panel cms-side-help">
          <h3>Quy trình xuất bản</h3>
          <p>1. Viết và lưu bản nháp.</p>
          <p>2. Điền SEO, danh mục và hình ảnh.</p>
          <p>3. Xem trước và rà soát nội dung.</p>
          <p>4. Xuất bản sau khi phê duyệt.</p>
          <p>Bài đã xuất bản hiển thị ngay trong Journal công khai, không cần cập nhật code.</p>
        </section>
      </aside>
    </form>}
  </div>;
}
