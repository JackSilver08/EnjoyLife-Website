"use client";
import {useEffect,useState} from "react";
import {Save} from "lucide-react";
import {MediaPicker} from "@/components/admin/media-picker";
import type {SiteContent} from "@/lib/site-content";

const empty:SiteContent={hero_image_url:"",hero_eyebrow:"",hero_title:"",hero_emphasis:"",story_image_url:"",story_eyebrow:"",story_title:"",story_emphasis:"",story_p1:"",story_p2:""};
export default function SiteContentAdmin(){
 const [data,setData]=useState<SiteContent>(empty);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{fetch("/api/store/site/content",{cache:"no-store"})
  .then(async res=>{if(!res.ok)throw Error("Không thể tải nội dung trang chủ.");return res.json() as Promise<SiteContent>})
  .then(setData).catch(e=>setError(String(e))).finally(()=>setLoading(false))},[]);
 function change<K extends keyof SiteContent>(key:K,value:SiteContent[K]){setData(d=>({...d,[key]:value}));setNotice("")}
 async function save(){
  setBusy(true);setNotice("");setError("");
  try{
   const res=await fetch("/api/store/admin/site/content",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
   const json=await res.json().catch(()=>null);
   if(!res.ok)throw Error(json?.error||"Không thể lưu nội dung.");
   setNotice("Đã cập nhật Hero và Story. Tải lại trang chủ để xem.");
  }catch(e){setError(e instanceof Error?e.message:"Lỗi cập nhật trang chủ.")}
  finally{setBusy(false)}
 }
 return <div className="cms-page">
  <span className="eyebrow">ENJOY LIFE / GIAO DIỆN</span>
  <div className="cms-page-heading"><div><h1>Câu chuyện thương hiệu.</h1><p>Thay hình ảnh, tiêu đề và nội dung Hero/Story mà không cần chỉnh code.</p></div>
   <button type="button" className="cms-primary-action" disabled={loading||busy} onClick={()=>void save()}><Save size={17}/>{busy?"ĐANG LƯU":"LƯU TRANG CHỦ"}</button>
  </div>
  {notice&&<p role="status" className="admin-notice">{notice}</p>}
  {error&&<p role="alert" className="admin-error">{error}</p>}
  {loading?<p>Đang tải nội dung...</p>:<div className="site-admin-grid">
   <section className="cms-panel"><h2>01 / Hero Banner</h2>
    <MediaPicker label="Ảnh banner toàn màn hình" value={data.hero_image_url} onSelect={u=>change("hero_image_url",u)}/>
    <label>Dòng giới thiệu<input maxLength={160} value={data.hero_eyebrow} onChange={e=>change("hero_eyebrow",e.target.value)}/></label>
    <label>Tiêu đề lớn<input maxLength={160} value={data.hero_title} onChange={e=>change("hero_title",e.target.value)}/></label>
    <label>Dòng nhấn mạnh (in nghiêng)<input maxLength={160} value={data.hero_emphasis} onChange={e=>change("hero_emphasis",e.target.value)}/></label>
   </section>
   <section className="cms-panel"><h2>02 / Brand Story</h2>
    <MediaPicker label="Ảnh minh họa câu chuyện" value={data.story_image_url} onSelect={u=>change("story_image_url",u)}/>
    <label>Dòng giới thiệu<input maxLength={160} value={data.story_eyebrow} onChange={e=>change("story_eyebrow",e.target.value)}/></label>
    <label>Tiêu đề<input maxLength={160} value={data.story_title} onChange={e=>change("story_title",e.target.value)}/></label>
    <label>Dòng nhấn mạnh<input maxLength={160} value={data.story_emphasis} onChange={e=>change("story_emphasis",e.target.value)}/></label>
    <label>Đoạn văn 1<textarea maxLength={1600} rows={4} value={data.story_p1} onChange={e=>change("story_p1",e.target.value)}/></label>
    <label>Đoạn văn 2<textarea maxLength={1600} rows={4} value={data.story_p2} onChange={e=>change("story_p2",e.target.value)}/></label>
   </section>
  </div>}
 </div>;
}
