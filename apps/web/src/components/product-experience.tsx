"use client";
import {useState} from "react";
import type {Product} from "@/lib/types";
import {ProductImageGallery} from "@/components/product-image-gallery";
import {ProductPicker} from "@/components/product-picker";
import {Virtual3DStudio} from "@/components/virtual-3d-studio";
import {Image as ImageIcon, Box} from "lucide-react";

const validModel=(url:string|undefined):url is string=>
 Boolean(url&&/^\/models\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}\.glb$/.test(url));

export function ProductExperience({product}:{product:Product}){
 const colors=[...new Set(product.variants.map(v=>v.color))];
 const [color,setColor]=useState(colors[0]??"");
 const [mode,setMode]=useState<"photos"|"3d">("photos");
 const inColor=product.variants.filter(v=>v.color===color);
 const [size,setSize]=useState(inColor.find(v=>v.available>0)?.size??inColor[0]?.size??"");
 const currentModel=product.colors?.find(x=>x.name===color)?.model_url;
 const has3D=validModel(currentModel);
 // Never show a made-up mannequin when the selected color has no GLB.
 const activeMode=has3D?mode:"photos";
 function chooseColor(value:string){
  setColor(value);
  const items=product.variants.filter(v=>v.color===value);
  setSize(items.find(v=>v.available>0)?.size??items[0]?.size??"");
  if(!validModel(product.colors?.find(x=>x.name===value)?.model_url))setMode("photos");
 }
 return <div className="detail-layout">
  <div className="virtual-experience">
   {has3D&&<div className="virtual-experience-tabs" role="tablist" aria-label="Chế độ xem sản phẩm">
    <button type="button" role="tab" aria-selected={activeMode==="photos"} className={activeMode==="photos"?"active":""}
     onClick={()=>setMode("photos")}><ImageIcon size={16}/> Ảnh 2D</button>
    <button type="button" role="tab" aria-selected={activeMode==="3d"} className={activeMode==="3d"?"active":""}
     onClick={()=>setMode("3d")}><Box size={17}/> Xem 3D</button>
   </div>}
   <div role={has3D?"tabpanel":undefined} aria-label={activeMode==="photos"?"Ảnh sản phẩm":"Mô hình sản phẩm 3D"}>
    {activeMode==="photos"?
     <ProductImageGallery key={color} product={product} color={color}/>:
     <Virtual3DStudio key={currentModel} modelUrl={currentModel!} colorName={color}
      productName={product.name} onBack={()=>setMode("photos")}/>}
   </div>
  </div>
  <ProductPicker product={product} color={color} size={size}
   onColorChange={chooseColor} onSizeChange={setSize}/>
 </div>;
}
