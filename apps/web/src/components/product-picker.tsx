"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {ShoppingBag,Check,HelpCircle} from "lucide-react";
import {useCart} from "@/components/cart-provider";
import {money} from "@/lib/format";
import type {Product} from "@/lib/types";
import {visualColor} from "@/lib/product-colors";
export function ProductPicker({product,color,size,onColorChange,onSizeChange}:{
 product:Product;color:string;size:string;onColorChange:(color:string)=>void;onSizeChange:(size:string)=>void;
}){
 const {add}=useCart();
 const colors=[...new Set(product.variants.map(v=>v.color))];
 const sizes=product.variants.filter(v=>v.color===color);
 const [added,setAdded]=useState(false);
 const [guide,setGuide]=useState(false);
 const [waitEmail,setWaitEmail]=useState("");
 const [waitConsent,setWaitConsent]=useState(false);
 const [waitBusy,setWaitBusy]=useState(false);
 const [waitMessage,setWaitMessage]=useState("");
 const selected=useMemo(()=>product.variants.find(v=>v.color===color&&v.size===size),[product,color,size]);
 async function joinWaitlist(){
  if(!selected||selected.available>0||!waitConsent||waitBusy)return;
  setWaitBusy(true);setWaitMessage("");
  try{
   const res=await fetch("/api/store/stock-alerts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({variant_id:selected.id,email:waitEmail,consent:waitConsent})});
   const json=await res.json();if(!res.ok)throw new Error(json.error||"Không thể ghi nhận yêu cầu.");
   setWaitMessage(json.message||"Đã đăng ký chờ hàng.");setWaitEmail("");setWaitConsent(false);
  }catch(err){setWaitMessage(err instanceof Error?err.message:"Không thể đăng ký.");}
  finally{setWaitBusy(false)}
 }
 const chooseColor=(c:string)=>{onColorChange(c);setAdded(false);setWaitMessage("")};
 function addToBag(){if(!selected||selected.available<=0)return;add({variantId:selected.id,productSlug:product.slug,name:product.name,sku:selected.sku,color:selected.color,size:selected.size,price:selected.price_vnd,image:product.images?.find(x=>x.color===color)?.url??product.images?.find(x=>!x.color)?.url??product.image_url,quantity:1});setAdded(true)}
 return <div className="picker"><span className="eyebrow">ENJOY LIFE / SẢN PHẨM</span><h1 className="detail-title">{product.name}</h1><p className="detail-price">{money(selected?.price_vnd??product.price_vnd)}</p>
 <div className="long-rule"/><p className="detail-description">{product.description}</p>
 <div className="option-set"><div className="option-title"><strong>MÀU SẮC</strong><span>{color}</span></div>
 <div className="product-color-options">{colors.map(c=>{
  const meta=product.colors?.find(x=>x.name===c);
  const swatch=visualColor(c,meta?.hex);
  return <button type="button" key={c} className={"product-color-choice "+(c===color?"selected":"")}
   title={c} aria-label={"Chọn màu "+c} onClick={()=>chooseColor(c)} aria-pressed={c===color}>
   {swatch?<span className="product-color-choice-dot" style={{backgroundColor:swatch}}/>:
     <span className="product-color-choice-dot product-color-unknown">?</span>}
   <span>{c}</span>
  </button>;
 })}</div></div>
 <div className="option-set"><div className="option-title"><strong>KÍCH THƯỚC</strong><button className="size-guide-toggle" type="button" aria-expanded={guide} onClick={()=>setGuide(!guide)}><HelpCircle size={15}/> Hướng dẫn chọn size</button></div>
 <div className="option-row">{sizes.map(v=><button type="button" key={v.id} className={"pill size "+(size===v.size?"selected":"")} onClick={()=>{onSizeChange(v.size);setAdded(false);setWaitMessage("")}} aria-pressed={v.size===size}>{v.size}{v.available<=0?" · Hết hàng":""}</button>)}</div>
 {guide&&<div className="size-guide-info" role="note"><strong>Chọn size phù hợp</strong><p>Vui lòng đối chiếu số đo cơ thể với bảng kích thước của từng mẫu trước khi mua. Bảng thông số chính xác cho sản phẩm này chưa được nhà bán hàng cung cấp; liên hệ cửa hàng để được hỗ trợ trước khi đặt.</p></div>}</div>
 <p className="inventory-hint" role="status">{!selected?"Chọn màu và kích thước":selected.available<=0?"Kích thước này đã hết hàng":selected.available<=3?"Sắp hết hàng":"Còn hàng"}</p>
 <button className="button-dark full-width" type="button" onClick={addToBag} disabled={!selected||selected.available<=0}>{added?<><Check size={17}/> ĐÃ THÊM VÀO GIỎ</>:<><ShoppingBag size={17}/> THÊM VÀO GIỎ</>}</button>
 {selected&&selected.available<=0&&<section className="stock-waitlist-card" aria-label="Đăng ký chờ hàng">
  <strong>Nhận thông báo khi có {product.name} · {selected.color}/{selected.size}</strong>
  <p>Không phải đặt trước, không giữ hàng và chưa phát sinh thanh toán. Cửa hàng sẽ chủ động liên hệ nếu có hàng trở lại.</p>
  <form onSubmit={e=>{e.preventDefault();void joinWaitlist()}}>
   <label>Email liên hệ<input required type="email" maxLength={254} value={waitEmail} onChange={e=>setWaitEmail(e.target.value)} placeholder="email@example.com"/></label>
   <label className="stock-waitlist-consent"><input required type="checkbox" checked={waitConsent} onChange={e=>setWaitConsent(e.target.checked)}/> Đồng ý để EnjoyLife lưu email và liên hệ về đúng biến thể này.</label>
   <button type="submit" disabled={!waitConsent||waitBusy||!waitEmail.trim()}>{waitBusy?"ĐANG GHI NHẬN...":"ĐĂNG KÝ CHỜ HÀNG"}</button>
  </form>
  {waitMessage&&<p role="status">{waitMessage}</p>}
 </section>}
 {added&&<Link className="simple-link" href="/cart">Đến giỏ hàng ↗</Link>}
 <div className="buyer-notes"><Link href="/policies">Giao hàng, thanh toán và đổi trả ↗</Link><span>Thanh toán COD đang khả dụng. Thanh toán QR chưa được kích hoạt.</span><span>Lưu ý: Hình ảnh và thông tin hiện phục vụ thử nghiệm, cần xác nhận với cửa hàng trước khi đặt hàng thật.</span></div>
 </div>;
}
