"use client";
import {useState} from "react";
const BASIC=["XS","S","M","L","XL","XXL"];
export function SizeMultiSelect({value,onChange}:{value:string[];onChange:(sizes:string[])=>void}){
 const [other,setOther]=useState("");
 function add(){
  const s=other.trim().toUpperCase();
  if(s&&s.length<=20&&!value.some(x=>x.toUpperCase()===s)&&value.length<12)onChange([...value,s]);
  setOther("");
 }
 return <div className="enjoy-size-selector">
  <strong>Kích thước cần tạo SKU</strong>
  <div className="enjoy-size-buttons">{BASIC.map(s=><button type="button" key={s}
   className={value.includes(s)?"selected":""} aria-pressed={value.includes(s)}
   onClick={()=>onChange(value.includes(s)?value.filter(x=>x!==s):value.length<12?[...value,s]:value)}>{s}</button>)}</div>
  <div className="enjoy-size-custom">
   <input aria-label="Size khác" value={other} maxLength={20} onChange={e=>setOther(e.target.value)}
    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add()}}} placeholder="Size khác: 38, 40, Freesize"/>
   <button type="button" onClick={add} disabled={!other.trim()||value.length>=12}>+ Thêm</button>
  </div>
  {value.some(s=>!BASIC.includes(s))&&<div className="enjoy-size-buttons">{value.filter(s=>!BASIC.includes(s)).map(s=><button key={s}
    type="button" className="selected" onClick={()=>onChange(value.filter(x=>x!==s))}>{s} ×</button>)}</div>}
  <small>Đã chọn {value.length} size; mỗi size là một SKU và có tồn kho riêng. Tối đa 12 size/lần.</small>
 </div>;
}
