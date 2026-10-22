"use client";
import {useMemo} from "react";
import {qrcodegen} from "@/lib/vendor/qrcodegen";

/**
 * First-party, scroll-free rendering of the exact VietQR payload returned
 * by payOS's authenticated Create Payment Link response. Do not modify
 * the payload or use a third-party QR image API.
 */
export function PayOSQRCode({value}:{value:string}){
 const model=useMemo(()=>{
  if(value.length<12||value.length>2900||/[^\x20-\x7E]/.test(value))return null;
  try{
   const code=qrcodegen.QrCode.encodeText(value,qrcodegen.QrCode.Ecc.MEDIUM);
   const pixels:string[]=[];
   for(let y=0;y<code.size;y++){
    for(let x=0;x<code.size;x++){
     if(code.getModule(x,y))pixels.push(`M${x} ${y}h1v1h-1z`);
    }
   }
   return {size:code.size,modules:pixels.join("")};
  }catch{return null}
 },[value]);
 if(!model)return <p role="alert" className="payos-qr-error">Không thể hiển thị dữ liệu VietQR. Vui lòng mở trang thanh toán payOS chính thức.</p>;
 const dimension=model.size+8;
 return <svg role="img" aria-label="Mã VietQR thanh toán, quét bằng ứng dụng ngân hàng"
   className="payos-qr-svg" viewBox={`-4 -4 ${dimension} ${dimension}`}
   xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
  <title>Mã VietQR thanh toán qua payOS</title>
  <rect x="-4" y="-4" width={dimension} height={dimension} fill="#fff"/>
  <path d={model.modules} fill="#101512"/>
 </svg>;
}
