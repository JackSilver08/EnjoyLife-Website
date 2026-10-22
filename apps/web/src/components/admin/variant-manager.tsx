"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";
type Variant={id:string;sku:string;color:string;size:string;price_vnd:number;active:boolean;on_hand:number;reserved:number;available:number;low_stock_threshold:number};
const blank={sku:"",color:"",size:"M",price_vnd:0,opening_stock:0};
export function VariantManager({productId}:{productId:string}){
 const {data,error,loading,reload}=useAdminData<{items:Variant[]}>("admin/products/"+productId+"/variants");
 const [form,setForm]=useState(blank);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);
 const [draft,setDraft]=useState({color:"",size:"",price_vnd:0,low_stock_threshold:3});
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setMessage("");
  try{const created=await adminAction("admin/products/"+productId+"/variants","POST",{...form,sku:""});
   setMessage("Đã thêm biến thể "+form.color+"/"+form.size+" với mã hàng "+created.sku+".");
   setForm(blank);await reload();
  }catch(err){setMessage(err instanceof Error?err.message:"Không thêm được size/màu mới.")}
  finally{setBusy(false)}
 }
 async function update(e:FormEvent<HTMLFormElement>,v:Variant){
  e.preventDefault();if(busy)return;
  if(!draft.color.trim()||!draft.size.trim()||!Number.isSafeInteger(draft.price_vnd)||draft.price_vnd<=0){
   setMessage("Màu, size và giá phải hợp lệ.");return
  }
  setBusy(true);setMessage("");
  try{await adminAction("admin/variants/"+v.id,"PATCH",{...draft,color:draft.color.trim(),size:draft.size.trim(),active:v.active});
   setEditing(null);setMessage("Đã cập nhật biến thể "+v.sku+".");await reload();
  }catch(err){setMessage(err instanceof Error?err.message:"Không thể cập nhật biến thể.")}
  finally{setBusy(false)}
 }
 async function toggle(v:Variant){
  if(!window.confirm((v.active?"Ngừng bán ":"Mở bán ")+v.sku+"?"))return;
  setBusy(true);setMessage("");
  try{await adminAction("admin/variants/"+v.id,"PATCH",{price_vnd:v.price_vnd,active:!v.active});
   setMessage("Đã cập nhật trạng thái "+v.sku+".");await reload();
  }catch(err){setMessage(err instanceof Error?err.message:"Không thay đổi được trạng thái.")}
  finally{setBusy(false)}
 }
 return <section className="admin-variants"><div className="admin-variant-title">
  <h3>Biến thể theo màu và kích thước</h3>
  <Link href={"/admin/inventory?product="+productId}>Xem kho sản phẩm ↗</Link>
 </div>
 <p className="admin-help">Mỗi tổ hợp màu và size chỉ xuất hiện một lần; hệ thống tự cấp mã hàng. Giá và tồn kho được quản lý riêng. Thay đổi số lượng tại Kho hàng.</p>
 {message&&<p role="status" className="admin-notice">{message}</p>}{error&&<p role="alert" className="admin-error">{error}</p>}
 {loading?<p>Đang tải biến thể...</p>:<div className="admin-table-wrap"><table className="admin-table">
  <thead><tr><th>Mã hàng</th><th>Màu / Size</th><th>Giá bán</th><th>Kho</th><th>Trạng thái / Thao tác</th></tr></thead>
  <tbody>{(data?.items??[]).map(v=><tr key={v.id}>
   <td>{v.sku}</td>
   <td>{editing===v.id?<form id={"edit-"+v.id} className="admin-variant-inline" onSubmit={e=>void update(e,v)}>
    <label>Màu<input autoFocus required maxLength={40} value={draft.color} onChange={e=>setDraft(d=>({...d,color:e.target.value}))}/></label>
    <label>Size<input required maxLength={20} value={draft.size} onChange={e=>setDraft(d=>({...d,size:e.target.value}))}/></label>
    <label>Giá bán (VND)<input required type="number" min={1} max={999999999} value={draft.price_vnd} onChange={e=>setDraft(d=>({...d,price_vnd:Number(e.target.value)}))}/></label>
    <label>Cảnh báo khi còn ≤<input required type="number" min={0} max={100000} value={draft.low_stock_threshold} onChange={e=>setDraft(d=>({...d,low_stock_threshold:Number(e.target.value)}))}/></label>
   </form>:v.color+" / "+v.size}</td>
   <td>{moneyVND(v.price_vnd)}</td>
   <td>{v.on_hand} thực tế <small>{v.available} có thể bán · {v.reserved} đã giữ · Cảnh báo ≤ {v.low_stock_threshold}</small></td>
   <td><span className="admin-pill">{v.active?"Đang bán":"Ngừng bán"}</span>
    <div className="admin-row-actions">
     {editing===v.id?<><button type="submit" form={"edit-"+v.id} disabled={busy}>Lưu</button>
       <button type="button" disabled={busy} onClick={()=>setEditing(null)}>Hủy</button></>
       :<><button type="button" disabled={busy} onClick={()=>{setEditing(v.id);setDraft({color:v.color,size:v.size,price_vnd:v.price_vnd,low_stock_threshold:v.low_stock_threshold});setMessage("")}}>Chỉnh sửa</button>
        <button type="button" disabled={busy} onClick={()=>void toggle(v)}>{v.active?"Ngừng bán":"Mở bán"}</button></>}
    </div></td>
  </tr>)}</tbody></table></div>}
 <form onSubmit={create} className="admin-variant-add">
  <h3>Thêm size / màu mới</h3>
  <div className="admin-form-grid">
   <label>Màu<input required maxLength={40} value={form.color} onChange={e=>setForm({...form,color:e.target.value})} placeholder="Trắng, Đen, Be..."/></label>
   <label>Size<input required maxLength={20} value={form.size} onChange={e=>setForm({...form,size:e.target.value})} placeholder="M, L, XL, 38..."/></label>
   <label>Giá bán (VND)<input type="number" required min={1} max={999999999} value={form.price_vnd||""} onChange={e=>setForm({...form,price_vnd:Number(e.target.value)})}/></label>
   <label>Tồn kho khởi tạo<input type="number" min={0} max={100000} step={1} required value={form.opening_stock} onChange={e=>setForm({...form,opening_stock:Number(e.target.value)})}/></label>
  </div>
  <button className="button-dark" disabled={busy} type="submit">{busy?"ĐANG LƯU...":"+ THÊM SIZE / MÀU"}</button>
 </form>
 </section>;
}
