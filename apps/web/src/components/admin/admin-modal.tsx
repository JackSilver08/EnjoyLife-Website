"use client";
import {useEffect,useRef,type ReactNode,type MouseEvent} from "react";
import {createPortal} from "react-dom";
import {X} from "lucide-react";
import {AdminToastViewport} from "@/components/admin/admin-toast";

/** Native <dialog> supplies focus containment, nested top layer, Escape and
 * inert background. The portal keeps dialog outside overflowing admin tables. */
export function AdminModal({title,subtitle,children,onClose,busy=false,wide=false}:{
 title:string;subtitle?:string;children:ReactNode;onClose:()=>void;busy?:boolean;wide?:boolean
}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const node=ref.current;
  if(!node)return;
  const oldOverflow=document.body.style.overflow;
  node.showModal();
  document.body.style.overflow="hidden";
  return()=>{if(node.open)node.close();document.body.style.overflow=oldOverflow};
 },[]);
 function cancel(e:React.SyntheticEvent<HTMLDialogElement>){
  e.preventDefault();
  if(!busy)onClose();
 }
 function backdrop(e:MouseEvent<HTMLDialogElement>){
  // Only the dialog itself (outside its visible sheet) dismisses the modal.
  if(e.target===e.currentTarget&&!busy)onClose();
 }
 return createPortal(<dialog ref={ref} onCancel={cancel} onClick={backdrop}
   className={`admin-modal${wide?" admin-modal-wide":""}`}
   aria-label={title} aria-modal="true">
   <div className="admin-modal-sheet" onClick={e=>e.stopPropagation()}>
    <header className="admin-modal-head">
     <div><span className="eyebrow">ENJOY LIFE / QUẢN TRỊ</span><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>
     <button aria-label="Đóng cửa sổ" title="Đóng" type="button" disabled={busy}
       className="admin-modal-close" onClick={onClose}><X size={21}/></button>
    </header>
    <div className="admin-modal-body">{children}</div>
    <AdminToastViewport/>
   </div>
  </dialog>,document.body);
}
