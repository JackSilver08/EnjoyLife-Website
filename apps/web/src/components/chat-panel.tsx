"use client";
import { useState } from "react";
import { MessageCircle, X, Sparkles, ArrowUpRight } from "lucide-react";
import Link from "next/link";
export function ChatPanel() {
  const [open, setOpen] = useState(false);
  return <div className="chat-dock">
    {open && <section className="chat-window" aria-label="Trợ lý thời trang">
      <div className="chat-head"><div><Sparkles size={16}/> ENJOY LIFE / TRỢ LÝ AI</div><button aria-label="Đóng chat" onClick={() => setOpen(false)}><X size={18}/></button></div>
      <div className="chat-content"><span className="tiny-badge">SẮP RA MẮT</span><h3>Người bạn đồng hành cùng phong cách của bạn.</h3><p>Chatbot AI hiện chưa kết nối model. Chúng tôi sẽ chỉ kích hoạt sau khi đã kiểm thử dữ liệu giá, tồn kho và chính sách thực tế.</p><Link href="/shop">Khám phá sản phẩm <ArrowUpRight size={16}/></Link></div>
    </section>}
    <button type="button" className="chat-launcher" onClick={() => setOpen(!open)} aria-label={open ? "Đóng trợ lý" : "Mở trợ lý thử nghiệm"}>{open ? <X size={23}/> : <MessageCircle size={23}/>}<span>HỎI ENJOY</span></button>
  </div>;
}
