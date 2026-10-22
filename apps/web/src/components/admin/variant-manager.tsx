"use client";
import {useState,type FormEvent} from "react";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";
type Variant={id:string;sku:string;color:string;size:string;price_vnd:number;active:boolean;on_hand:number;reserved:number;available:number};
const blank={sku:"",color:"",size:"M",price_vnd:0,opening_stock:0};
export function VariantManager({productId}:{productId:string}){
 const {data,error,loading,reload}=useAdminData<{items:Variant[]}>("admin/products/"+productId+"/variants");
 const [form,setForm]=useState(blank);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");
  try{const created=await adminAction("admin/products/"+productId+"/variants","POST",{...form,sku:""});setMessage("Đã thêm màu/size mới. Mã hàng: "+created.sku+".");setForm(blank);await reload()}
  catch(err){setMessage(err instanceof Error?err.message:"Không thêm được SKU.")}finally{setBusy(false)}
 }
 async function update(variant:Variant){
  const entry=window.prompt("Giá bán VND cho SKU "+variant.sku,String(variant.price_vnd));
  if(entry===null)return;
  const price=Number(entry);
  if(!Number.isSafeInteger(price)||price<1){setMessage("Giá không hợp lệ.");return}
  setBusy(true);setMessage("");
  try{await adminAction("admin/variants/"+variant.id,"PATCH",{price_vnd:price,active:variant.active});setMessage("Đã cập nhật giá.");await reload()}
  catch(err){setMessage(err instanceof Error?err.message:"Không thể cập nhật giá.")}finally{setBusy(false)}
 }
 async function toggle(variant:Variant){
  if(!window.confirm((variant.active?"Ngừng bán ":"Mở bán ")+variant.sku+"?"))return;
  setBusy(true);setMessage("");
  try{await adminAction("admin/variants/"+variant.id,"PATCH",{price_vnd:variant.price_vnd,active:!variant.active});setMessage("Đã cập nhật trạng thái SKU.");await reload()}
  catch(err){setMessage(err instanceof Error?err.message:"Không thay đổi được SKU.")}finally{setBusy(false)}
 }
 return <section className="admin-variants"><h3>Biến thể theo màu và kích thước</h3>
 {message&&<p role="status" className="admin-notice">{message}</p>}{error&&<p role="alert" className="admin-error">{error}</p>}
 {loading?<p>Đang tải biến thể...</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã hàng</th><th>Màu / Size</th><th>Giá</th><th>Kho</th><th>Trạng thái / Thao tác</th></tr></thead><tbody>{(data?.items??[]).map(x=><tr key={x.id}><td>{x.sku}</td><td>{x.color} / {x.size}</td><td>{moneyVND(x.price_vnd)}</td><td>{x.available} bán được <small>{x.reserved} đã giữ</small></td><td><span className="admin-pill">{x.active?"Đang bán":"Ngừng bán"}</span><div className="admin-row-actions"><button disabled={busy} type="button" onClick={()=>void update(x)}>Sửa giá</button><button disabled={busy} type="button" onClick={()=>void toggle(x)}>{x.active?"Ngừng bán":"Mở bán"}</button></div></td></tr>)}</tbody></table></div>}
 <form onSubmit={create} className="admin-variant-add"><h3>Thêm size / màu mới</h3><p className="admin-help">Mã hàng SP-001, SP-002... được hệ thống cấp khi lưu. Bạn chỉ cần chọn màu và size.</p><div className="admin-form-grid">

  <label>Màu<input value={form.color} required onChange={e=>setForm({...form,color:e.target.value})}/></label>
  <label>Size<input value={form.size} required onChange={e=>setForm({...form,size:e.target.value})}/></label>
  <label>Giá VND<input type="number" required min={1} value={form.price_vnd||""} onChange={e=>setForm({...form,price_vnd:Number(e.target.value)})}/></label>
  <label>Nhập kho ban đầu<input type="number" min={0} required value={form.opening_stock} onChange={e=>setForm({...form,opening_stock:Number(e.target.value)})}/></label>
 </div><button className="button-dark" disabled={busy} type="submit">{busy?"ĐANG LƯU...":"+ THÊM BIẾN THỂ"}</button></form>
 </section>;
}
