"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowDown,ArrowUp,Images,Trash2,UploadCloud} from "lucide-react";
import {adminAction,useAdminData} from "@/components/admin/admin-data";
import {MediaPicker} from "@/components/admin/media-picker";
import {uploadMedia} from "@/lib/media-api";
import {optimizeProductImage} from "@/lib/image-optimizer";

type ImageItem={url:string;alt:string};
export function ProductGalleryManager({productId,onSaved}:{productId:string;onSaved?:(url:string)=>void}){
 const {data,loading,error,reload}=useAdminData<{images:ImageItem[]}>("admin/products/"+productId+"/images");
 const [images,setImages]=useState<ImageItem[]>([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const filesRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(data)setImages(data.images||[])},[data]);
 function add(url:string){
  setImages(prev=>prev.some(item=>item.url===url)?prev:prev.length<12?[...prev,{url,alt:""}]:prev);
 }
 function move(index:number,direction:number){
  setImages(prev=>{const next=[...prev],target=index+direction;
   if(target<0||target>=next.length)return prev;
   [next[index],next[target]]=[next[target],next[index]];
   return next;
  });
 }
 async function uploads(list:FileList|null){
  if(!list?.length)return;
  setBusy(true);setMessage("");
  try{
   for(let i=0;i<list.length;i++){
    const file=list.item(i);if(!file)continue;
    setMessage("Đang tối ưu và tải ảnh "+(i+1)+"/"+list.length+"...");
    const optimized=await optimizeProductImage(file);
    const saved=await uploadMedia(optimized);
    add(saved.url);
   }
   setMessage("Đã tải ảnh lên. Nhấn LƯU GALLERY để áp dụng cho sản phẩm.");
  }catch(e){setMessage(e instanceof Error?e.message:"Tải ảnh thất bại.")}
  finally{setBusy(false);if(filesRef.current)filesRef.current.value=""}
 }
 async function save(){
  setBusy(true);setMessage("");
  try{
   const result=await adminAction("admin/products/"+productId+"/images","PUT",{images});
   setMessage("Đã lưu "+result.images.length+" ảnh, ảnh đầu tiên là ảnh đại diện.");
   onSaved?.(result.cover||"");await reload();
  }catch(e){setMessage(e instanceof Error?e.message:"Không thể lưu album ảnh.")}
  finally{setBusy(false)}
 }
 return <section className="admin-product-gallery">
  <div className="admin-gallery-head"><div><h3>Album ảnh sản phẩm</h3><p className="admin-help">Tối đa 12 ảnh. Ảnh đầu tiên là ảnh đại diện; sử dụng mũi tên để thay đổi thứ tự.</p></div>
   <span>{images.length}/12 ảnh</span></div>
  {error&&<p role="alert" className="admin-error">{error}</p>}
  {message&&<p role="status" className="admin-notice">{message}</p>}
  {loading?<p>Đang tải ảnh...</p>:<>
   <div className="admin-gallery-grid">
    {images.map((img,index)=><div className="admin-gallery-item" key={img.url}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={img.url} alt={img.alt||"Ảnh sản phẩm số "+(index+1)}/>
     {index===0&&<span className="admin-gallery-cover">Ảnh đại diện</span>}
     <label>Alt text
      <input maxLength={160} value={img.alt} onChange={e=>setImages(prev=>prev.map((x,i)=>i===index?{...x,alt:e.target.value}:x))} placeholder="Mô tả nội dung ảnh"/>
     </label>
     <div className="admin-gallery-item-actions">
      <button type="button" aria-label="Đưa ảnh lên trước" disabled={busy||index===0} onClick={()=>move(index,-1)}><ArrowUp size={16}/></button>
      <button type="button" aria-label="Đưa ảnh xuống sau" disabled={busy||index===images.length-1} onClick={()=>move(index,1)}><ArrowDown size={16}/></button>
      <button type="button" aria-label="Gỡ ảnh khỏi sản phẩm" disabled={busy} onClick={()=>setImages(prev=>prev.filter((_,i)=>i!==index))}><Trash2 size={16}/></button>
     </div>
    </div>)}
    {images.length===0&&<div className="admin-gallery-empty"><Images size={26}/><p>Sản phẩm chưa có ảnh. Tải ảnh từ máy hoặc chọn từ Thư viện.</p></div>}
   </div>
   <div className="admin-gallery-tools">
    <input hidden ref={filesRef} type="file" multiple accept="image/jpeg,image/png,image/webp"
     onChange={e=>void uploads(e.target.files)}/>
    <button type="button" disabled={busy||images.length>=12} onClick={()=>filesRef.current?.click()}>
     <UploadCloud size={16}/> Thêm nhiều ảnh từ máy
    </button>
    <div className="admin-gallery-media">
     <MediaPicker compact label="Hoặc chọn từ Thư viện ảnh" value="" onSelect={add}/>
    </div>
   </div>
   <p className="admin-help">Ảnh mới được thu nhỏ khi cần và ưu tiên WebP nếu dung lượng giảm. Không xóa file gốc trong Thư viện khi gỡ ảnh khỏi album.</p>
   <button type="button" className="button-dark" disabled={busy} onClick={()=>void save()}>{busy?"ĐANG LƯU...":"LƯU GALLERY"}</button>
  </>}
 </section>;
}
