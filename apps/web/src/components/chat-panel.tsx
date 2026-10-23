"use client";

import { FormEvent, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending) return;

    const history = messages.slice(-6);
    const nextMessage: ChatMessage = { role: "user", content: text };
    setMessages((current) => [...current, nextMessage]);
    setMessage("");
    setSending(true);
    try {
      const response = await fetch("/api/store/ai/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };
      const answer = data.answer;
      if (!response.ok || !answer) throw new Error(data.error || "Không thể nhận phản hồi.");
      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "Không thể nhận phản hồi.";
      setMessages((current) => [...current, { role: "assistant", content: fallback }]);
    } finally {
      setSending(false);
    }
  }

  return <div className="chat-dock">
    {open && <section className="chat-window" aria-label="Trợ lý thời trang">
      <div className="chat-head"><div><Sparkles size={16}/> ENJOY LIFE / TRỢ LÝ AI</div><button type="button" aria-label="Đóng chat" onClick={() => setOpen(false)}><X size={18}/></button></div>
      <div className="chat-content chat-live">
        {messages.length === 0 && <div className="chat-intro"><span className="tiny-badge">TRỢ LÝ MUA SẮM</span><h3>Tìm món đồ hợp với bạn.</h3><p>Hỏi về sản phẩm, màu, size, giá hoặc tình trạng còn hàng. Thông tin giá và tồn kho được kiểm tra trực tiếp từ cửa hàng.</p></div>}
        {messages.length > 0 && <div className="chat-messages" aria-live="polite">
          {messages.map((item, index) => <p key={`${item.role}-${index}`} className={`chat-message ${item.role}`}>{item.content}</p>)}
          {sending && <p className="chat-typing" aria-label="Trợ lý đang trả lời">Đang kiểm tra…</p>}
        </div>}
        <form className="chat-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="enjoy-ai-message">Nhập câu hỏi cho trợ lý</label>
          <input id="enjoy-ai-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1200} placeholder="Ví dụ: Váy màu trắng còn size M không?" disabled={sending} />
          <button type="submit" aria-label="Gửi câu hỏi" disabled={!message.trim() || sending}><Send size={16}/></button>
        </form>
      </div>
    </section>}
    <button type="button" className="chat-launcher" onClick={() => setOpen(!open)} aria-label={open ? "Đóng trợ lý" : "Mở trợ lý mua sắm"}>{open ? <X size={23}/> : <MessageCircle size={23}/>}<span>HỎI ENJOY</span></button>
  </div>;
}
