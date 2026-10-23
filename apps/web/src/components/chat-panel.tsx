"use client";

import {FormEvent,useEffect,useRef,useState} from "react";
import {MessageCircle,Send,Sparkles,X,RotateCcw} from "lucide-react";

type ChatMessage={role:"user"|"assistant";content:string};
type ChatStatus="checking"|"ready"|"missing"|"unknown";
const suggestions=["Có sản phẩm nào còn size M?","Có món nào dưới 300.000đ?","Enjoy Life hỗ trợ thanh toán thế nào?"];
const safeProductLink=/^\/products\/[a-z0-9-]{1,100}$/;
function AssistantContent({content}:{content:string}){
 const fragments=content.split(/(\/products\/[a-z0-9-]{1,100})/g);
 return <>{fragments.map((part,index)=>safeProductLink.test(part)?
  <a key={index} className="chat-product-link" href={part}>{part} ↗</a>:<span key={index}>{part}</span>)}</>;
}

export function ChatPanel(){
 const [open,setOpen]=useState(false);
 const [message,setMessage]=useState("");
 const [messages,setMessages]=useState<ChatMessage[]>([]);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState("");
 const [status,setStatus]=useState<ChatStatus>("unknown");
 const transcript=useRef<HTMLDivElement>(null);

 useEffect(()=>{
  if(!open)return;
  let active=true;
  fetch("/api/store/ai/status",{cache:"no-store"})
   .then(async response=>{if(!response.ok)throw Error("Not ready");return response.json()})
   .then((data:{configured?:boolean})=>{if(active)setStatus(data.configured===true?"ready":"missing")})
   .catch(()=>{if(active)setStatus("unknown")});
  return()=>{active=false};
 },[open]);

 useEffect(()=>{
  transcript.current?.scrollTo({top:transcript.current.scrollHeight,behavior:"smooth"});
 },[messages,sending,error]);

 async function send(text:string){
  const content=text.trim();
  if(!content||sending||status==="missing")return;
  const history=messages.slice(-6);
  setMessages(current=>[...current,{role:"user",content}]);
  setMessage("");setError("");setSending(true);
  try{
   const response=await fetch("/api/store/ai/customer",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({message:content,history}),
   });
   const payload=(await response.json()) as {answer?:string;error?:string;code?:string};
   if(!response.ok||!payload.answer)throw Error(payload.error||"Không thể nhận phản hồi từ trợ lý.");
   setMessages(current=>[...current,{role:"assistant",content:payload.answer!}]);
  }catch(err){
   // API/server failures must not be inserted into conversation history as AI advice.
   setError(err instanceof Error?err.message:"Không kết nối được trợ lý.");
  }finally{setSending(false)}
 }
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();void send(message)}
 const blocked=sending||status==="missing";
 return <div className="chat-dock">
  {open&&<section className="chat-window" aria-label="Trợ lý mua sắm Enjoy Life">
   <div className="chat-head">
    <div><Sparkles size={16}/> ENJOY LIFE / TRỢ LÝ AI</div>
    <div className="chat-head-actions">
     <button type="button" title="Làm mới hội thoại" aria-label="Xóa hội thoại" onClick={()=>{setMessages([]);setError("");setMessage("")}}><RotateCcw size={16}/></button>
     <button type="button" aria-label="Đóng chat" onClick={()=>setOpen(false)}><X size={18}/></button>
    </div>
   </div>
   <div className="chat-content chat-live">
    <div className="chat-messages" ref={transcript} aria-live="polite" aria-label="Nội dung hội thoại">
     {messages.length===0&&<div className="chat-intro">
      <span className="tiny-badge">TRỢ LÝ MUA SẮM</span>
      <h3>Chọn món đồ hợp với bạn.</h3>
      <p>Hỏi về giá, màu, size, hàng còn hay chính sách. Trợ lý kiểm tra dữ liệu sản phẩm của cửa hàng khi trả lời.</p>
      <div className="chat-suggestions">
       {suggestions.map(value=><button type="button" key={value} disabled={blocked} onClick={()=>void send(value)}>{value}</button>)}
      </div>
     </div>}
     {messages.map((item,index)=><p key={index} className={`chat-message ${item.role}`}>
      {item.role==="assistant"?<AssistantContent content={item.content}/>:item.content}
     </p>)}
     {sending&&<p className="chat-typing">Đang kiểm tra sản phẩm và soạn câu trả lời…</p>}
     {status==="missing"&&<div role="status" className="chat-error">Chatbot chưa được kích hoạt trên máy chủ. Kiểm tra OPENAI_API_KEY và khởi động lại container API.</div>}
     {error&&<div role="alert" className="chat-error">{error}<button type="button" onClick={()=>setError("")} aria-label="Đóng thông báo lỗi"><X size={13}/></button></div>}
    </div>
    <form className="chat-form" onSubmit={submit}>
     <label className="sr-only" htmlFor="enjoy-ai-message">Nhập câu hỏi cho trợ lý</label>
     <input id="enjoy-ai-message" value={message} onChange={event=>setMessage(event.target.value)}
      maxLength={1200} placeholder="Hỏi về size, giá, màu hoặc chính sách..." disabled={blocked}/>
     <button type="submit" aria-label="Gửi câu hỏi" disabled={!message.trim()||blocked}><Send size={16}/></button>
    </form>
    <small className="chat-privacy">Không nhập mật khẩu, thông tin thanh toán hoặc dữ liệu nhạy cảm.</small>
   </div>
  </section>}
  <button type="button" className="chat-launcher" onClick={()=>setOpen(!open)}
   aria-label={open?"Đóng trợ lý":"Mở trợ lý mua sắm"}>
   {open?<X size={23}/>:<MessageCircle size={23}/>}<span>HỎI ENJOY</span>
  </button>
 </div>;
}
