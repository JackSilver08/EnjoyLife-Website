"use client";
import Link from "next/link";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import {ArrowUpRight,Plus,RefreshCcw,Trash2,Edit3,Send,FilePenLine} from "lucide-react";
import {journalApi} from "@/lib/blog-api";
import {AdminModal} from "@/components/admin/admin-modal";
import {AdminFeedback} from "@/components/admin/admin-toast";
import {JournalArticleForm} from "@/components/admin/journal-article-form";
import {useAdminData} from "@/components/admin/admin-data";
import {useAppDialog} from "@/components/app-dialog";
import {asSlug,type BlogArticle,type BlogCategory,type BlogTag,type BlogStatus} from "@/lib/blog-types";

const statusLabel:{[key in BlogStatus]:string}={DRAFT:"Bản nháp",PUBLISHED:"Đã xuất bản"};
const PAGE_SIZE=12;

function EditorFromID({id,onSaved,onClose}:{id:string;onSaved:(published:boolean)=>void;onClose:()=>void}){
 const {data,loading,error,reload}=useAdminData<BlogArticle>("admin/blog/articles/"+id);
 if(loading)return <p>Đang tải bài viết...</p>;
 if(error||!data)return <><AdminFeedback error={error||"Không tìm thấy bài viết."}/><button onClick={()=>void reload()}>Thử lại</button></>;
 return <JournalArticleForm key={data.id} initial={data} onSaved={onSaved} onCancel={onClose}/>;
}
export default function AdminBlog(){
 const {confirm}=useAppDialog();
 const [items,setItems]=useState<BlogArticle[]>([]);
 const [count,setCount]=useState(0);
 const [filter,setFilter]=useState<"ALL"|BlogStatus>("ALL");
 const [page,setPage]=useState(0);
 const [search,setSearch]=useState("");
 const [loading,setLoading]=useState(true);
 const [working,setWorking]=useState("");
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [categories,setCategories]=useState<BlogCategory[]>([]);
 const [tags,setTags]=useState<BlogTag[]>([]);
 const [taxonomyModal,setTaxonomyModal]=useState<"category"|"tag"|null>(null);
 const [articleModal,setArticleModal]=useState<"new"|string|null>(null);
 const [categoryName,setCategoryName]=useState("");
 const [categoryDescription,setCategoryDescription]=useState("");
 const [tagName,setTagName]=useState("");

 const reload=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const result=await journalApi.list(filter,page*PAGE_SIZE,PAGE_SIZE);
   setItems(result.items??[]);setCount(result.total);
  }catch(e){setItems([]);setError(e instanceof Error?e.message:"Không thể tải bài viết.");}
  finally{setLoading(false)}
 },[filter,page]);
 const reloadTaxonomies=useCallback(async()=>{
  try{
   const [c,t]=await Promise.all([journalApi.categories(),journalApi.tags()]);
   setCategories(c.items??[]);setTags(t.items??[]);
  }catch(e){setError(e instanceof Error?e.message:"Không tải được danh mục.");}
 },[]);
 useEffect(()=>{const id=window.setTimeout(()=>{void reload()},0);return()=>window.clearTimeout(id)},[reload]);
 useEffect(()=>{const id=window.setTimeout(()=>{void reloadTaxonomies()},0);return()=>window.clearTimeout(id)},[reloadTaxonomies]);

 async function switchStatus(item:BlogArticle){
  const next=item.status==="DRAFT"?"PUBLISHED":"DRAFT";
  const msg=next==="PUBLISHED"?"Xuất bản bài \""+item.title+"\"?":"Gỡ xuất bản bài \""+item.title+"\"?";
  if(!await confirm({title:next==="PUBLISHED"?"Xuất bản bài viết?":"Đưa bài viết về bản nháp?",message:msg,confirmLabel:next==="PUBLISHED"?"Xuất bản":"Đưa về bản nháp",cancelLabel:"Hủy"}))return;
  setWorking(item.id);setError("");setMessage("");
  try{
   await journalApi.setStatus(item.id,next,item.version);
   setMessage(next==="PUBLISHED"?"Đã xuất bản lên database. Đến Sprint 4 trang công khai mới hiển thị bài này.":"Đã chuyển bài về nháp.");
   await reload();
  }catch(e){setError(e instanceof Error?e.message:"Không thể cập nhật.");}
  finally{setWorking("")}
 }
 async function archive(item:BlogArticle){
  if(!await confirm({title:"Lưu trữ bài viết?",message:"\""+item.title+"\" sẽ không còn xuất hiện trong danh sách; slug vẫn được giữ.",confirmLabel:"Lưu trữ",cancelLabel:"Giữ lại",danger:true}))return;
  setWorking(item.id);setError("");setMessage("");
  try{await journalApi.archive(item.id,item.version);setMessage("Đã lưu trữ bài viết.");await reload();}
  catch(e){setError(e instanceof Error?e.message:"Không thể lưu trữ.");}
  finally{setWorking("")}
 }
 async function createTaxonomy(e:FormEvent,kind:"category"|"tag"){
  e.preventDefault();
  const name=kind==="category"?categoryName.trim():tagName.trim();
  if(name.length<2){setError("Tên cần ít nhất 2 ký tự.");return}
  setWorking(kind);setError("");setMessage("");
  try{
   if(kind==="category"){
    await journalApi.addCategory({name,slug:asSlug(name).slice(0,80),description:categoryDescription});
    setCategoryName("");setCategoryDescription("");setMessage("Đã tạo danh mục.");
   }else{
    await journalApi.addTag({name,slug:asSlug(name).slice(0,80)});
    setTagName("");setMessage("Đã tạo thẻ.");
   }
   await reloadTaxonomies();setTaxonomyModal(null);
  }catch(e){setError(e instanceof Error?e.message:"Không tạo được danh mục hoặc thẻ.")}
  finally{setWorking("")}
 }
 const matches=items.filter(x=>[x.title,x.slug,x.excerpt].some(v=>v.toLowerCase().includes(search.toLowerCase())));
 return <div className="cms-page">
  <div className="cms-page-heading">
   <div><span className="eyebrow">ENJOY LIFE / CONTENT STUDIO</span><h1>Enjoy Journal</h1>
   <p>Quản lý nội dung thời trang, phê duyệt xuất bản và chuẩn bị dữ liệu SEO từ PostgreSQL.</p></div>
   <button type="button" className="cms-primary-action" onClick={()=>setArticleModal("new")}><Plus size={17}/> Viết bài mới</button>
  </div>
  <div className="cms-kpi-row">
   <div><strong>{count}</strong><span>Bài trong bộ lọc</span></div>
   <div><strong>{items.filter(x=>x.status==="DRAFT").length}</strong><span>Bản nháp trên trang</span></div>
   <div><strong>{items.filter(x=>x.status==="PUBLISHED").length}</strong><span>Đã xuất bản trên trang</span></div>
   <div><strong>{categories.length}</strong><span>Danh mục nội dung</span></div>
  </div>
  <section className="cms-panel">
   <div className="cms-list-toolbar">
    <label>Trạng thái
     <select value={filter} onChange={e=>{setFilter(e.target.value as "ALL"|BlogStatus);setPage(0)}}>
      <option value="ALL">Tất cả bài viết</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã xuất bản</option>
     </select>
    </label>
    <label>Tìm trong trang hiện tại
     <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên bài, slug..."/>
    </label>
    <button type="button" className="cms-secondary-action" onClick={()=>void reload()}><RefreshCcw size={15}/> Làm mới</button>
   </div>
   <AdminFeedback message={message} error={error}/>
   {loading?<div className="cms-loading">Đang tải bài viết...</div>:matches.length===0?
    <div className="cms-empty"><FilePenLine size={38}/><h2>Chưa có bài viết phù hợp</h2>
     <p>Bắt đầu bằng một bài nháp mới hoặc thay đổi bộ lọc.</p>
     <button type="button" onClick={()=>setArticleModal("new")} className="cms-primary-action"><Plus size={17}/> Tạo bài viết</button></div>
    :<div className="admin-table-wrap">
      <table className="admin-table cms-table"><thead><tr><th>Bài viết</th><th>Danh mục</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th></tr></thead>
       <tbody>{matches.map(item=><tr key={item.id}>
        <td><strong>{item.title}</strong><small>/blog/{item.slug}</small>
          <small>{item.excerpt.length>85?item.excerpt.slice(0,85)+"…":item.excerpt}</small></td>
        <td>{item.category_slug||"Chưa phân loại"}</td>
        <td><span className={item.status==="PUBLISHED"?"cms-status is-public":"cms-status"}>{statusLabel[item.status]}</span><small>v{item.version}</small></td>
        <td>{new Date(item.updated_at).toLocaleString("vi-VN")}</td>
        <td><div className="cms-action-buttons">
          <button type="button" onClick={()=>setArticleModal(item.id)}><Edit3 size={14}/> Sửa</button>
          <button disabled={!!working} type="button" onClick={()=>void switchStatus(item)}>
            <Send size={14}/>{item.status==="DRAFT"?"Xuất bản":"Gỡ bài"}</button>
          <button disabled={!!working} className="cms-danger" type="button" onClick={()=>void archive(item)}>
            <Trash2 size={14}/> Lưu trữ</button>
        </div></td>
       </tr>)}</tbody>
      </table>
     </div>}
   <div className="cms-pagination"><span>Hiển thị tối đa {PAGE_SIZE} bài/trang · Tổng {count} bài</span>
     <div><button type="button" disabled={page===0||loading} onClick={()=>setPage(p=>p-1)}>← Trước</button>
     <span>Trang {page+1} / {Math.max(1,Math.ceil(count/PAGE_SIZE))}</span>
     <button type="button" disabled={loading||(page+1)*PAGE_SIZE>=count} onClick={()=>setPage(p=>p+1)}>Sau →</button></div>
   </div>
  </section>
  <section className="cms-taxonomy" id="taxonomy" aria-labelledby="taxonomy-title">
   <div className="cms-section-intro"><span className="eyebrow">QUẢN LÝ NỘI DUNG</span><h2 id="taxonomy-title">Danh mục & tags.</h2>
    <p>Tạo nhãn để phân loại bài viết. Các lựa chọn mới sẽ có trong trình soạn thảo sau khi tải lại.</p></div>
   <div className="cms-taxonomy-grid">
    <div className="cms-panel"><h3>Danh mục bài viết</h3>
     <div className="cms-term-list">{categories.length?categories.map(c=><span key={c.slug}>{c.name} <small>/{c.slug}</small></span>):<p>Chưa có danh mục.</p>}</div>
     <button className="cms-secondary-action" type="button" onClick={()=>setTaxonomyModal("category")}><Plus size={15}/> + Danh mục</button>
     {taxonomyModal==="category"&&<AdminModal title="Thêm danh mục Journal" onClose={()=>!working&&setTaxonomyModal(null)} busy={!!working}><form onSubmit={e=>{void createTaxonomy(e,"category")}}>
      <label>Tên danh mục<input required minLength={2} maxLength={120} placeholder="Ví dụ: Phong cách" value={categoryName} onChange={e=>setCategoryName(e.target.value)}/></label>
      <label>Mô tả ngắn<input maxLength={500} value={categoryDescription} onChange={e=>setCategoryDescription(e.target.value)}/></label>
      <button type="submit" disabled={!!working} className="cms-secondary-action"><Plus size={15}/> Thêm danh mục</button>
     </form></AdminModal>}
    </div>
    <div className="cms-panel"><h3>Tags</h3>
     <div className="cms-term-list">{tags.length?tags.map(t=><span key={t.slug}>{t.name}</span>):<p>Chưa có thẻ nào.</p>}</div>
     <button className="cms-secondary-action" type="button" onClick={()=>setTaxonomyModal("tag")}><Plus size={15}/> + Tag</button>
     {taxonomyModal==="tag"&&<AdminModal title="Thêm tag Journal" onClose={()=>!working&&setTaxonomyModal(null)} busy={!!working}><form onSubmit={e=>{void createTaxonomy(e,"tag")}}>
      <label>Tên tag<input required minLength={2} maxLength={120} placeholder="Ví dụ: Streetwear" value={tagName} onChange={e=>setTagName(e.target.value)}/></label>
      <button type="submit" disabled={!!working} className="cms-secondary-action"><Plus size={15}/> Thêm tag</button>
     </form></AdminModal>}
    </div>
   </div>
  </section>
  {articleModal&&<AdminModal title={articleModal==="new"?"Viết bài Journal mới":"Chỉnh sửa bài Journal"} subtitle="Biên tập nội dung, hình ảnh, SEO và trạng thái xuất bản." onClose={()=>setArticleModal(null)} wide>
   {articleModal==="new"
     ?<JournalArticleForm onSaved={published=>{setArticleModal(null);setMessage(published?"Đã xuất bản bài viết thành công.":"Đã lưu bản nháp thành công.");void reload()}} onCancel={()=>setArticleModal(null)}/>
     :<EditorFromID id={articleModal} onClose={()=>setArticleModal(null)} onSaved={published=>{setArticleModal(null);setMessage(published?"Đã cập nhật bài viết và xuất bản.":"Đã lưu thay đổi bài viết.");void reload()}}/>}
  </AdminModal>}
  <div className="cms-note">Tài khoản Admin hiện được phép xuất bản. Tính năng AI viết bài sẽ chỉ tạo bản nháp để Admin kiểm duyệt ở sprint tích hợp AI. <Link href="/blog" target="_blank">Xem trang Journal <ArrowUpRight size={13}/></Link></div>
 </div>;
}
