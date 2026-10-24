"use client";

import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from "react";
import {AlertTriangle,Check,Info,LockKeyhole,X} from "lucide-react";

type DialogKind="confirm"|"prompt";
type DialogState={kind:DialogKind;title:string;message:string;confirmLabel:string;cancelLabel:string;danger:boolean;value:string};
type DialogAPI={confirm:(options:DialogOptions|string)=>Promise<boolean>;prompt:(options:PromptOptions|string)=>Promise<string|null>};
type DialogOptions={title?:string;message:string;confirmLabel?:string;cancelLabel?:string;danger?:boolean};
type PromptOptions=DialogOptions&{defaultValue?:string;placeholder?:string};
type Pending={resolve:(value:boolean|string|null)=>void};

const DialogContext=createContext<DialogAPI|null>(null);

export function AppDialogProvider({children}:{children:ReactNode}){
 const [dialog,setDialog]=useState<DialogState|null>(null);
 const pending=useRef<Pending|null>(null);
 const finish=useCallback((value:boolean|string|null)=>{
  pending.current?.resolve(value);pending.current=null;setDialog(null);
 },[]);
 const confirm=useCallback((options:DialogOptions|string)=>new Promise<boolean>(resolve=>{
  const value=typeof options==="string"?{message:options}:options;
  pending.current={resolve:value=>resolve(value===true)};
  setDialog({kind:"confirm",title:value.title??"Xác nhận thao tác",message:value.message,confirmLabel:value.confirmLabel??"Xác nhận",cancelLabel:value.cancelLabel??"Hủy",danger:value.danger??false,value:""});
 }),[]);
 const prompt=useCallback((options:PromptOptions|string)=>new Promise<string|null>(resolve=>{
  const value=typeof options==="string"?{message:options}:options;
  pending.current={resolve:value=>resolve(typeof value==="string"?value:null)};
  setDialog({kind:"prompt",title:value.title??"Nhập thông tin",message:value.message,confirmLabel:value.confirmLabel??"Lưu",cancelLabel:value.cancelLabel??"Hủy",danger:value.danger??false,value:value.defaultValue??""});
 }),[]);
 useEffect(()=>{
  if(!dialog)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")finish(null);};
  window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
 },[dialog,finish]);
 return <DialogContext.Provider value={{confirm,prompt}}>
  {children}
  {dialog&&<div className="app-dialog-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)finish(null)}}>
   <section className="app-dialog" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" aria-describedby="app-dialog-message">
    <div className={`app-dialog-icon ${dialog.danger?"is-danger":""}`}>{dialog.danger?<AlertTriangle size={21}/>:dialog.kind==="prompt"?<Info size={21}/>:<LockKeyhole size={20}/>}</div>
    <div className="app-dialog-body">
     <div className="app-dialog-heading"><h2 id="app-dialog-title">{dialog.title}</h2><button type="button" className="app-dialog-close" aria-label="Đóng" onClick={()=>finish(null)}><X size={18}/></button></div>
     <p id="app-dialog-message">{dialog.message}</p>
     {dialog.kind==="prompt"&&<input autoFocus className="app-dialog-input" value={dialog.value} placeholder="Nhập nội dung..." onChange={event=>setDialog(current=>current?{...current,value:event.target.value}:current)} onKeyDown={event=>{if(event.key==="Enter")finish(dialog.value)}}/>}
     <div className="app-dialog-actions"><button type="button" className="app-dialog-cancel" onClick={()=>finish(null)}>{dialog.cancelLabel}</button><button type="button" autoFocus={dialog.kind==="confirm"} className={`app-dialog-confirm ${dialog.danger?"is-danger":""}`} onClick={()=>finish(dialog.kind==="prompt"?dialog.value:true)}>{dialog.kind==="confirm"?<Check size={16}/>:null}{dialog.confirmLabel}</button></div>
    </div>
   </section>
  </div>}
 </DialogContext.Provider>;
}

export function useAppDialog(){
 const context=useContext(DialogContext);
 if(!context)throw Error("useAppDialog must be used inside AppDialogProvider");
 return context;
}
