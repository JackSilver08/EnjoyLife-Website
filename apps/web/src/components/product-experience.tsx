"use client";
import {useState} from "react";
import type {Product} from "@/lib/types";
import {ProductImageGallery} from "@/components/product-image-gallery";
import {ProductPicker} from "@/components/product-picker";

export function ProductExperience({product}:{product:Product}){
 const colors=[...new Set(product.variants.map(v=>v.color))];
 const [color,setColor]=useState(colors[0]??"");
 const inColor=product.variants.filter(v=>v.color===color);
 const [size,setSize]=useState(inColor.find(v=>v.available>0)?.size??inColor[0]?.size??"");
 function chooseColor(value:string){
  setColor(value);
  const items=product.variants.filter(v=>v.color===value);
  setSize(items.find(v=>v.available>0)?.size??items[0]?.size??"");
 }
 return <div className="detail-layout">
  <ProductImageGallery key={color} product={product} color={color}/>
  <ProductPicker product={product} color={color} size={size}
   onColorChange={chooseColor} onSizeChange={setSize}/>
 </div>;
}
