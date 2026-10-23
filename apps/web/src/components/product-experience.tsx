"use client";
import {useState} from "react";
import type {Product} from "@/lib/types";
import {ProductImageGallery} from "@/components/product-image-gallery";
import {ProductPicker} from "@/components/product-picker";
import {Virtual3DStudio} from "@/components/virtual-3d-studio";
import {visualColor} from "@/lib/product-colors";
import {Image as ImageIcon, Box} from "lucide-react";

export function ProductExperience({product}:{product:Product}){
 const colors=[...new Set(product.variants.map(v=>v.color))];
 const [color,setColor]=useState(colors[0]??"");
 const [mode,setMode]=useState<"photos"|"3d">("photos");
 const inColor=product.variants.filter(v=>v.color===color);
 const [size,setSize]=useState(inColor.find(v=>v.available>0)?.size??inColor[0]?.size??"");
 function chooseColor(value:string){
  setColor(value);
  const items=product.variants.filter(v=>v.color===value);
  setSize(items.find(v=>v.available>0)?.size??items[0]?.size??"");
 }
 const meta=product.colors?.find(x=>x.name===color);
 const shade=visualColor(color,meta?.hex)||"#d4d0c8";
 const modelUrl=meta?.model_url??"";
 return <div className="detail-layout">
  <div className="virtual-experience">
   <div className="virtual-experience-tabs" role="tablist" aria-label="Chế độ xem sản phẩm">
    <button type="button" role="tab" aria-selected={mode==="photos"} className={mode==="photos"?"active":""}
     onClick={()=>setMode("photos")}><ImageIcon size={16}/> Ảnh 2D</button>
    <button type="button" role="tab" aria-selected={mode==="3d"} className={mode==="3d"?"active":""}
     onClick={()=>setMode("3d")}><Box size={17}/> Xem 3D</button>
   </div>
   <div role="tabpanel" aria-label={mode==="photos"?"Ảnh sản phẩm":"Không gian 3D"}>
    {mode==="photos"?<ProductImageGallery key={color} product={product} color={color}/>:
     <Virtual3DStudio key={color+modelUrl} color={shade} colorName={color}
      category={product.category_slug} modelUrl={modelUrl} onBack={()=>setMode("photos")}/>}
   </div>
  </div>
  <ProductPicker product={product} color={color} size={size}
   onColorChange={chooseColor} onSizeChange={setSize}/>
 </div>;
}
