"use client";
import {useEffect,useState} from "react";
import Image from "next/image";
import {ChevronLeft,ChevronRight,Expand, X} from "lucide-react";
import type {Product} from "@/lib/types";

export function ProductImageGallery({product}:{product:Product}){
 const all=product.images?.filter(x=>!!x.url)??[];
 const images=all.length?all:product.image_url?[{url:product.image_url,alt:product.name}]:[];
 const [index,setIndex]=useState(0);
 const [open,setOpen]=useState(false);
 const selected=images[index]??images[0];
 useEffect(()=>{
  if(!open)return;
  function key(e:KeyboardEvent){
   if(e.key==="Escape")setOpen(false);
   if(e.key==="ArrowLeft")setIndex(v=>(v+images.length-1)%images.length);
   if(e.key==="ArrowRight")setIndex(v=>(v+1)%images.length);
  }
  window.addEventListener("keydown",key);
  return()=>window.removeEventListener("keydown",key);
 },[open,images.length]);
 if(!images.length)return <div className="detail-visual"><div className="empty-photo"/></div>;
 const move=(delta:number)=>setIndex(v=>(v+images.length+delta)%images.length);
 return <div className="product-gallery">
  <div className="detail-visual product-gallery-primary">
   <Image key={selected.url} src={selected.url} alt={selected.alt||product.name} width={1100} height={1450}
     priority={index===0} sizes="(max-width: 720px) 100vw, 55vw"/>
   <button type="button" className="product-gallery-expand" onClick={()=>setOpen(true)} aria-label="Phóng to ảnh"><Expand size={18}/> Xem lớn</button>
   {images.length>1&&<div className="product-gallery-nav">
    <button type="button" onClick={()=>move(-1)} aria-label="Ảnh trước"><ChevronLeft size={20}/></button>
    <span>{index+1} / {images.length}</span>
    <button type="button" onClick={()=>move(1)} aria-label="Ảnh tiếp"><ChevronRight size={20}/></button>
   </div>}
  </div>
  {images.length>1&&<div className="product-gallery-thumbnails" aria-label="Các ảnh sản phẩm">
   {images.map((item,i)=><button type="button" key={item.url} className={i===index?"is-selected":""}
     onClick={()=>setIndex(i)} aria-label={"Xem ảnh "+(i+1)} aria-pressed={i===index}>
    <Image src={item.url} alt={item.alt||"Ảnh sản phẩm "+(i+1)} width={92} height={112} sizes="92px"/>
   </button>)}
  </div>}
  {open&&<div className="product-gallery-lightbox" role="dialog" aria-modal="true" aria-label={"Xem ảnh "+product.name}>
    <button type="button" className="product-gallery-lightbox-close" onClick={()=>setOpen(false)} aria-label="Đóng xem ảnh"><X size={24}/></button>
    {images.length>1&&<button type="button" onClick={()=>move(-1)} aria-label="Ảnh trước"><ChevronLeft size={30}/></button>}
    <Image src={selected.url} alt={selected.alt||product.name} width={1200} height={1400} sizes="95vw"/>
    {images.length>1&&<button type="button" onClick={()=>move(1)} aria-label="Ảnh tiếp"><ChevronRight size={30}/></button>}
    <span className="product-gallery-lightbox-counter">{index+1}/{images.length}</span>
  </div>}
 </div>;
}
