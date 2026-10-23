"use client";
import {useState} from "react";
import {Check,Plus} from "lucide-react";
import {COLOR_GROUPS,PRODUCT_COLORS,isColorHex,presetForColor,type ColorChoice} from "@/lib/product-colors";

export function ColorPicker({value,onChange,label="Màu sắc",known=[]}:{
 value:ColorChoice;onChange:(value:ColorChoice)=>void;label?:string;known?:ColorChoice[];
}){
 const [manual,setManual]=useState(false);
 const ownCustom=!!value.name&&!presetForColor(value.name);
 const custom=manual||ownCustom;
 const knownExtra=known.filter(x=>x.name&&!presetForColor(x.name));
 function choose(v:ColorChoice){setManual(false);onChange({...v})}
 return <fieldset className="enjoy-color-field">
  <legend>{label} <span aria-hidden="true">*</span></legend>
  <div className="enjoy-color-palette" role="group" aria-label="Bảng màu phổ biến">
   {PRODUCT_COLORS.map(item=><button key={item.name} type="button"
     className={"enjoy-color-preset"+(!custom&&item.name===value.name?" selected":"")}
     title={item.name} aria-label={"Chọn màu "+item.name}
     aria-pressed={!custom&&item.name===value.name} onClick={()=>choose(item)}>
     <span className="enjoy-color-dot" style={{backgroundColor:item.hex}} aria-hidden="true">
      {!custom&&item.name===value.name&&<Check size={16} strokeWidth={3}/>}
     </span><span>{item.name}</span>
   </button>)}
  </div>
  {knownExtra.length>0&&<div className="enjoy-color-recent">
   <small>Màu riêng của sản phẩm</small>
   <div className="enjoy-color-recent-list">{knownExtra.map(item=><button type="button" key={item.name}
     onClick={()=>choose(item)} className="enjoy-color-recent-btn">
     <span className="enjoy-color-dot" style={{backgroundColor:isColorHex(item.hex)?item.hex:"#ddd"}}/>
     {item.name}
   </button>)}</div>
  </div>}
  <button type="button" className="enjoy-color-custom-toggle" onClick={()=>{setManual(true);onChange({name:"",hex:"#A7A7A7",group:"Khác"})}}>
   <Plus size={15}/> Tạo màu riêng
  </button>
  {custom&&<div className="enjoy-color-custom">
   <label>Tên màu
    <input value={value.name} maxLength={40} required onChange={e=>onChange({...value,name:e.target.value})} placeholder="Ví dụ: Be cát"/>
   </label>
   <label>Nhóm màu
    <select value={COLOR_GROUPS.includes(value.group as typeof COLOR_GROUPS[number])?value.group:"Khác"}
      onChange={e=>onChange({...value,group:e.target.value})}>
     {COLOR_GROUPS.map(g=><option value={g} key={g}>{g}</option>)}
    </select>
   </label>
   <label>Mã HEX
    <input value={value.hex} required pattern="#[0-9a-fA-F]{6}" maxLength={7}
      onChange={e=>onChange({...value,hex:e.target.value})} placeholder="#C8AE88"/>
   </label>
   <label className="enjoy-color-native-picker">Bảng pha màu
    <input aria-label="Chọn sắc độ màu tùy chỉnh" type="color"
     value={isColorHex(value.hex)?value.hex:"#A7A7A7"}
     onChange={e=>onChange({...value,hex:e.target.value.toUpperCase()})}/>
   </label>
  </div>}
  <div className="enjoy-color-current">
   <span className="enjoy-color-current-chip" style={{backgroundColor:isColorHex(value.hex)?value.hex:"#e5e5e5"}}/>
   <div><strong>{value.name||"Chưa chọn màu"}</strong><small>{value.hex||"Chưa có HEX"} · {value.group||"Chưa phân nhóm"}</small></div>
  </div>
  <p className="admin-help">HEX chỉ là màu đại diện. Ảnh vải và ảnh sản phẩm thật được quản lý riêng trong Gallery.</p>
 </fieldset>;
}
