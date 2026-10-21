"use client";
import Link from "next/link";
import {useEffect} from "react";
export default function JournalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error("Enjoy Journal failed to render:",error)},[error]);
 return <section className="page-shell journal-not-found" role="alert">
  <span className="eyebrow">ENJOY JOURNAL / KẾT NỐI</span>
  <h1>Chưa tải được bài viết.</h1>
  <p>Hệ thống tạm thời không kết nối được dữ liệu. Không có nội dung mẫu thay thế.</p>
  <button type="button" className="journal-retry" onClick={()=>reset()}>THỬ LẠI ↗</button>
  <Link href="/" className="text-link">VỀ TRANG CHỦ</Link>
 </section>;
}
