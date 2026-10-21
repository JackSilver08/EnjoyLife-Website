"use client";
import {useState} from "react";
import {adminAction,useAdminData} from "@/components/admin/admin-data";
type Stock={variant_id:string;sku:string;name:string;color:string;size:string;on_hand:number;reserved:number;unavailable:number;available:number};
export default function Inventory(){
 const {data,error,loading,reload}=useAdminData<{items:Stock[]}>("admin/inventory");
 const [search,setSearch]=useState("");const [low,setLow]=useState(false);const [edit,setEdit]=useState<string|null>(null);const [delta,setDelta]=useState("");const [reason,setReason]=useState("");const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");
 const rows=(data?.items??[]).filter(x=>(!low||x.available<=3)&&(x.sku+" "+x.name+" "+x.color+" "+x.size).toLowerCase().includes(search.toLowerCase()));
 async function save(variant:Stock){
  const n=Number(delta);if(!Number.isInteger(n)||n===0){setNotice("Nhập số nguyên khác 0.");return}
  setBusy(true);setNotice("");
  try{await adminAction("admin/inventory/"+variant.variant_id,"PATCH",{delta:n,reason});setNotice("Đã cập nhật kho cho "+variant.sku);setEdit(null);setReason("");setDelta("");await reload()}
  catch(err){setNotice(err instanceof Error?err.message:"Không thể cập nhật kho.")}finally{setBusy(false)}
 }
 return <><span className="eyebrow">VẬN HÀNH / TỒN KHO</span><h1>Quản lý kho hàng</h1><p className="admin-subtitle">Theo dõi số lượng thực tế, hàng giữ chỗ và số lượng có thể bán theo từng SKU.</p>
 <div className="admin-toolbar"><input aria-label="Tìm kiếm SKU" placeholder="Tìm SKU, sản phẩm, size..." value={search} onChange={e=>setSearch(e.target.value)}/><label><input type="checkbox" checked={low} onChange={e=>setLow(e.target.checked)}/> Chỉ hàng sắp hết (≤ 3)</label><button onClick={()=>void reload()}>Làm mới</button></div>
 {notice&&<p role="status" className="admin-notice">{notice}</p>}{error&&<p role="alert" className="admin-error">{error}</p>}
 <section className="admin-surface">{loading?<p>Đang tải...</p>:!rows.length?<p className="admin-empty">Không có SKU phù hợp.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Sản phẩm / SKU</th><th>Màu / Size</th><th>Tồn thực tế</th><th>Đã giữ</th><th>Không khả dụng</th><th>Có thể bán</th><th>Thao tác</th></tr></thead><tbody>{rows.map(x=><tr key={x.variant_id}><td><strong>{x.name}</strong><small>{x.sku}</small></td><td>{x.color} / {x.size}</td><td>{x.on_hand}</td><td>{x.reserved}</td><td>{x.unavailable}</td><td><strong className={x.available<=3?"admin-low":""}>{x.available}</strong></td><td>{edit===x.variant_id?<div className="admin-inline-form"><label>Điều chỉnh (+ / −)<input type="number" min="-10000" max="10000" value={delta} onChange={e=>setDelta(e.target.value)}/></label><label>Lý do<input value={reason} maxLength={300} onChange={e=>setReason(e.target.value)} placeholder="Nhập bổ sung, kiểm kê..."/></label><button disabled={busy||reason.trim().length<6} onClick={()=>void save(x)}>Lưu</button><button disabled={busy} onClick={()=>setEdit(null)}>Hủy</button></div>:<button onClick={()=>{setEdit(x.variant_id);setDelta("");setReason("");setNotice("")}}>Điều chỉnh</button>}</td></tr>)}</tbody></table></div>}</section>
 <p className="admin-help">Không thể giảm tồn thấp hơn số hàng đã giữ chỗ. Mọi lần điều chỉnh được ghi vào lịch sử kho và nhật ký Admin.</p>
 </>;
}
