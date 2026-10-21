"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {UploadCloud,Images,Copy,Check} from "lucide-react";
import {fetchMediaAssets,uploadMedia,type MediaAsset} from "@/lib/media-api";

export default function AdminMedia(){
 const [items,setItems]=useState<MediaAsset[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [copied,setCopied]=useState("");
 const picker=useRef<HTMLInputElement>(null);
 useEffect(()=>{fetchMediaAssets().then(setItems).catch(e=>setError(String(e))).finally(()=>setLoading(false))},[]);
 async function receive(files:FileList|null){
  if(!files?.length)return;
  setBusy(true);setError("");setMessage("");
  try{
   for(let i=0;i<files.length;i++){
    const f=files.item(i);if(!f)continue;
    setMessage("Tải lên "+(i+1)+"/"+files.length+": "+f.name);
    const asset=await uploadMedia(f);
    setItems(old=>[asset,...old]);
   }
   setMessage("Đã lưu ảnh vào thư viện Enjoy Life.");
  }catch(e){setError(e instanceof Error?e.message:"Không thể tải ảnh.")}
  finally{setBusy(false);if(picker.current)picker.current.value=""}
 }
 async function copy(url:string){
  try{await navigator.clipboard.writeText(url);setCopied(url)}
  catch{setError("Trình duyệt không cho phép sao chép. Hãy chọn ảnh trực tiếp trong form.")}
 }
 return <div className="cms-page">
  <span className="eyebrow">ENJOY LIFE / MEDIA MANAGER</span>
  <div className="cms-page-heading"><div><h1>Thư viện hình ảnh.</h1>
   <p>Tải ảnh từ máy lên để sử dụng trong sản phẩm, bài viết, Hero và câu chuyện thương hiệu.</p></div>
   <button className="cms-primary-action" type="button" disabled={busy} onClick={()=>picker.current?.click()}>
    <UploadCloud size={18}/> {busy?"ĐANG TẢI...":"TẢI ẢNH TỪ MÁY"}
   </button>
  </div>
  <input hidden multiple ref={picker} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
   onChange={e=>void receive(e.target.files)}/>
  <div className="cms-note">Ảnh được lưu trên volume <code>media_data</code> của Docker, không lưu trực tiếp trong PostgreSQL. Không chạy <code>docker compose down -v</code>. Khi đưa lên server cần backup cả database lẫn media.</div>
  {error&&<p role="alert" className="admin-error">{error}</p>}
  {message&&<p role="status" className="admin-notice">{message}</p>}
  {loading?<p className="cms-loading">Đang tải thư viện...</p>:
  items.length===0?<div className="cms-empty"><Images size={44}/><h2>Chưa có hình ảnh.</h2><p>Chọn ảnh từ máy để bắt đầu tạo kho media thật.</p></div>:
  <div className="media-manager-grid">{items.map(item=><article key={item.id} className="media-manager-card">
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src={item.url} alt={item.original_name} loading="lazy"/>
   <div><strong title={item.original_name}>{item.original_name}</strong><small>{(item.size_bytes/1024).toFixed(0)} KB · {item.content_type}</small>
    <button type="button" onClick={()=>void copy(item.url)}>{copied===item.url?<Check size={15}/>:<Copy size={15}/>}
      {copied===item.url?"Đã sao chép":"Sao chép đường dẫn"}</button></div>
  </article>)}</div>}
  <p className="cms-note">Có thể chọn trực tiếp từ thư viện trong <Link href="/admin/products">Quản lý sản phẩm</Link>, <Link href="/admin/blog/new">Bài viết</Link> và <Link href="/admin/site">Giao diện trang chủ</Link>. Ảnh đã dùng không bị xóa từ đây để tránh gãy liên kết.</p>
 </div>;
}
