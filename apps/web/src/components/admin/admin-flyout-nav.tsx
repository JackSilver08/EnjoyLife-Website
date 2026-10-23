"use client";

import Link from "next/link";
import {createPortal} from "react-dom";
import {useEffect,useRef,useState,type CSSProperties} from "react";
import {ChevronRight,X,type LucideIcon} from "lucide-react";

export type FlyoutNavItem={href:string;label:string;icon:LucideIcon};
export type FlyoutNavGroup={id:string;label:string;icon:LucideIcon;items:FlyoutNavItem[]};
type OpenFlyout={id:string;left:number;top:number;compact:boolean};

function isCurrent(pathname:string,href:string){
 if(href==="/admin/warehouse"&&pathname.startsWith("/admin/warehouse/insights"))return false;
 return pathname===href||pathname.startsWith(href+"/");
}

/**
 * The menu is portalled to document.body because the Admin sidebar owns a
 * scrollable navigation area. A menu inside that area gets clipped by its
 * overflow even with a very high z-index.
 */
export function AdminFlyoutNav({groups,pathname}:{groups:FlyoutNavGroup[];pathname:string}){
 const [open,setOpen]=useState<OpenFlyout|null>(null);
 const panelRef=useRef<HTMLDivElement>(null);
 const triggers=useRef(new Map<string,HTMLButtonElement>());
 const selected=groups.find(group=>group.id===open?.id);

 function toggle(group:FlyoutNavGroup){
  if(open?.id===group.id){setOpen(null);return}
  const node=triggers.current.get(group.id);
  if(!node)return;
  const trigger=node.getBoundingClientRect();
  const sidebar=node.closest(".admin-sidebar")?.getBoundingClientRect();
  const compact=window.innerWidth<=900;
  const menuHeight=Math.min(window.innerHeight-24,group.items.length*44+76);
  const left=compact?12:Math.max(12,Math.min(window.innerWidth-292,(sidebar?.right??trigger.right)+12));
  const top=compact?Math.max(12,window.innerHeight-menuHeight-12):
   Math.max(12,Math.min(window.innerHeight-menuHeight-12,trigger.top));
  setOpen({id:group.id,left,top,compact});
 }

 // Dismiss on outside click, Escape, or page/viewport scroll. Sidebar
 // content and portal contents are both considered "inside".
 useEffect(()=>{
  if(!open)return;
  const current=open.id;
  const panel=panelRef.current;
  panel?.querySelector<HTMLAnchorElement>("a")?.focus();
  function dismissPointer(event:PointerEvent){
   const target=event.target;
   if(!(target instanceof Node))return;
   if(panelRef.current?.contains(target))return;
   for(const button of triggers.current.values())if(button.contains(target))return;
   setOpen(null);
  }
  function escapeKey(event:KeyboardEvent){
   if(event.key!=="Escape")return;
   event.preventDefault();
   setOpen(null);
   triggers.current.get(current)?.focus();
  }
  function focusAway(event:FocusEvent){
   const target=event.target;
   if(!(target instanceof Node))return;
   if(panelRef.current?.contains(target))return;
   for(const button of triggers.current.values())if(button.contains(target))return;
   setOpen(null);
  }
  function scrolled(event:Event){
   if(event.target instanceof Node&&panelRef.current?.contains(event.target))return;
   setOpen(null);
  }
  const resized=()=>setOpen(null);
  document.addEventListener("pointerdown",dismissPointer);
  document.addEventListener("keydown",escapeKey);
  document.addEventListener("focusin",focusAway);
  window.addEventListener("resize",resized);
  window.addEventListener("scroll",scrolled,true);
  return()=>{
   document.removeEventListener("pointerdown",dismissPointer);
   document.removeEventListener("keydown",escapeKey);
   document.removeEventListener("focusin",focusAway);
   window.removeEventListener("resize",resized);
   window.removeEventListener("scroll",scrolled,true);
  };
 },[open]);

 return <>
  <div className="admin-nav-groups admin-flyout-triggers">
   {groups.map(group=>{
    const Icon=group.icon;
    const active=group.items.some(item=>isCurrent(pathname,item.href));
    const expanded=open?.id===group.id;
    return <button key={group.id} type="button"
     ref={node=>{if(node)triggers.current.set(group.id,node);else triggers.current.delete(group.id)}}
     className={`admin-flyout-trigger${active?" admin-flyout-trigger-active":""}${expanded?" admin-flyout-trigger-open":""}`}
     aria-haspopup="true" aria-expanded={expanded} aria-controls={expanded?"admin-flyout-"+group.id:undefined}
     onClick={()=>toggle(group)}
     onKeyDown={event=>{if(event.key==="ArrowRight"){event.preventDefault();if(!expanded)toggle(group)}}}>
     <Icon size={18} aria-hidden="true"/>
     <span>{group.label}</span>
     <ChevronRight size={16} className="admin-flyout-trigger-arrow" aria-hidden="true"/>
    </button>;
   })}
  </div>
  {selected&&open&&createPortal(<div
    ref={panelRef}
    id={"admin-flyout-"+selected.id}
    className={`admin-flyout-panel${open.compact?" admin-flyout-panel-compact":""}`}
    role="region" aria-label={selected.label}
    style={{left:open.left,top:open.top} as CSSProperties}>
    <div className="admin-flyout-header">
     <span>{selected.label}</span>
     <button type="button" aria-label={"Đóng "+selected.label}
      onClick={()=>{setOpen(null);triggers.current.get(selected.id)?.focus()}}>
      <X size={17} aria-hidden="true"/>
     </button>
    </div>
    <div className="admin-flyout-links">
     {selected.items.map(item=>{
      const Icon=item.icon;
      const active=isCurrent(pathname,item.href);
      return <Link key={item.href} href={item.href}
       aria-current={active?"page":undefined}
       className={active?"admin-flyout-link admin-flyout-link-active":"admin-flyout-link"}
       onClick={()=>setOpen(null)}>
       <Icon size={17} aria-hidden="true"/><span>{item.label}</span>
       {active&&<span className="admin-flyout-current" aria-hidden="true"/>}
      </Link>;
     })}
    </div>
   </div>,document.body)}
 </>;
}
