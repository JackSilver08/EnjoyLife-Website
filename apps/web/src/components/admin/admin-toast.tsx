"use client";
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {CheckCircle2,AlertCircle,Info,X} from "lucide-react";
type Kind="success"|"error"|"info";
type Toast={id:number;message:string;kind:Kind};
type Notify=(message:string,kind?:Kind)=>void;
type ToastHub={items:Toast[];notify:Notify;close:(id:number)=>void};
const ToastContext=createContext<ToastHub|null>(null);
let nextToast=0;

export function AdminToastProvider({children}:{children:ReactNode}){
 const [items,setItems]=useState<Toast[]>([]);
 const timers=useRef(new Map<number,ReturnType<typeof setTimeout>>());
 const close=useCallback((id:number)=>{
  const timer=timers.current.get(id);if(timer)clearTimeout(timer);
  timers.current.delete(id);
  setItems(prev=>prev.filter(item=>item.id!==id));
 },[]);
 const notify=useCallback<Notify>((message,kind="success")=>{
  const clean=message.trim();if(!clean)return;
  const id=++nextToast;
  setItems(prev=>[...prev.slice(-3),{id,message:clean,kind}]);
  const timer=setTimeout(()=>close(id),kind==="error"?8000:5200);
  timers.current.set(id,timer);
 },[close]);
 useEffect(()=>{
  const active=timers.current;
  return()=>{for(const timer of active.values())clearTimeout(timer);active.clear()};
 },[]);
 return <ToastContext.Provider value={{items,notify,close}}>
  {children}
  <AdminToastViewport/>
 </ToastContext.Provider>;
}
/** Render within the top-layer modal as well as the page. Otherwise a native
 * dialog backdrop will visually hide notifications while an editor is open. */
export function AdminToastViewport(){
 const hub=useContext(ToastContext);
 if(!hub)throw Error("AdminToastViewport requires AdminToastProvider");
 return <div className="admin-toast-stack" aria-label="Thông báo quản trị" aria-live="polite" aria-atomic="false">
  {hub.items.map(item=><div key={item.id} className={`admin-toast admin-toast-${item.kind}`} role={item.kind==="error"?"alert":"status"}>
   {item.kind==="success"?<CheckCircle2 size={21}/>:item.kind==="error"?<AlertCircle size={21}/>:<Info size={21}/>}
   <span>{item.message}</span>
   <button type="button" aria-label="Đóng thông báo" onClick={()=>hub.close(item.id)}><X size={17}/></button>
  </div>)}
 </div>;
}
export function useAdminToast(){
 const hub=useContext(ToastContext);
 if(!hub)throw Error("useAdminToast must be used inside AdminToastProvider");
 return hub.notify;
}
/** Existing async form state can transition to toast without breaking errors.
 * Avoid blank/unmounted notices; errors deliberately have longer lifetime. */
export function AdminFeedback({message,error}:{message?:string|null;error?:string|null}){
 const notify=useAdminToast();
 const prevMessage=useRef("");
 const prevError=useRef("");
 useEffect(()=>{
  if(message&&message!==prevMessage.current){
   const kind:Kind=/^Đã\b/i.test(message)?"success":/^(Đang|Tải lên|Đã tải)/i.test(message)?"info":"error";
   notify(message,kind);
  }
  prevMessage.current=message||"";
 },[message,notify]);
 useEffect(()=>{
  if(error&&error!==prevError.current)notify(error,"error");
  prevError.current=error||"";
 },[error,notify]);
 return null;
}
