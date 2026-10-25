"use client";
import {useEffect,useRef,useState} from "react";
import {ImagePlus,FolderOpen,UploadCloud,X} from "lucide-react";
import {fetchMediaAssets,uploadMedia,type MediaAsset} from "@/lib/media-api";
import {AdminFeedback} from "@/components/admin/admin-toast";

type Props={
 label?:string;value:string;onSelect:(url:string)=>void;
 onUpload?:(asset:MediaAsset)=>void;compact?:boolean;field?:boolean;
};
export function MediaPicker({label="Ảnh",value,onSelect,onUpload,compact=false,field=false}:Props){
 const [open,setOpen]=useState(false);
 const [items,setItems]=useState<MediaAsset[]>([]);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  if(!open)return;
  let active=true;
  fetchMediaAssets().then(result=>{if(active)setItems(result)}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Không tải được thư viện.")});
  return()=>{active=false};
 },[open]);
 async function uploadFiles(files:FileList|null){
  if(!files?.length)return;
  setBusy(true);setError("");setProgress("");
  try{
   for(let index=0;index<files.length;index++){
    const file=files.item(index);if(!file)continue;
    setProgress("Đang tải "+(index+1)+"/"+files.length+": "+file.name);
    const asset=await uploadMedia(file);
    setItems(previous=>[asset,...previous]);
    onSelect(asset.url);onUpload?.(asset);
   }
   setProgress("Tải ảnh thành công.");
  }catch(e){setError(e instanceof Error?e.message:"Tải ảnh thất bại.")}
  finally{setBusy(false);if(input.current)input.current.value="";}
 }
 return <div className={field?"media-picker media-picker-field":compact?"media-picker media-picker-compact":"media-picker"}>
  {field?<div className="media-picker-field-top">
    <span className="media-picker-field-label">{label}</span>
    <button className="media-picker-library-link" type="button" disabled={busy}
     onClick={()=>setOpen(o=>!o)}><FolderOpen size={14}/>{open?"Đóng thư viện":"Thư viện ảnh"}</button>
   </div>
   :<div className="media-picker-top">
    <span>{label}</span>
    <div className="media-picker-actions">
     <button type="button" disabled={busy} onClick={()=>input.current?.click()}><UploadCloud size={16}/> Chọn ảnh từ máy</button>
     <button type="button" disabled={busy} onClick={()=>setOpen(o=>!o)}><FolderOpen size={16}/> {open?"Đóng thư viện":"Thư viện ảnh"}</button>
    </div>
   </div>}
  {field&&<button className="media-picker-upload-field" type="button" disabled={busy}
   onClick={()=>input.current?.click()}><UploadCloud size={18}/>
   <span>{busy?"Đang tải ảnh lên...":value?"Thay ảnh đại diện từ máy":"Chọn ảnh từ máy"}</span>
  </button>}
  <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" hidden
   onChange={e=>void uploadFiles(e.target.files)}/>
  {value&&<div className="media-picked">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={value} alt="Ảnh đã chọn" loading="lazy"/>
    <span>{value}</span>
    <button type="button" aria-label="Bỏ chọn ảnh" onClick={()=>onSelect("")}><X size={17}/></button>
  </div>}
  {progress&&<p role="status" className="media-picker-progress">{progress}</p>}
  <AdminFeedback error={error}/>
  {open&&<div className="media-gallery-panel">
   {items.length===0?<p>Thư viện còn trống. Hãy chọn ảnh từ máy để tải lên.</p>
   :<div className="media-gallery-grid">{items.map(item=><button key={item.id} type="button"
    className={value===item.url?"media-gallery-item selected":"media-gallery-item"}
    aria-label={"Chọn ảnh "+item.original_name}
    onClick={()=>{onSelect(item.url);setOpen(false)}}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={item.url} alt={item.original_name} loading="lazy"/>
     <span>{item.original_name}</span>
    </button>)}</div>}
   <p className="media-picker-help"><ImagePlus size={15}/> JPG, PNG hoặc WebP; tối đa 8MB/ảnh. Ảnh production lưu trên Supabase Storage.</p>
  </div>}
 </div>;
}
