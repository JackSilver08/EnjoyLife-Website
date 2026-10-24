"use client";
import {Fragment,useState,type FormEvent} from "react";
import Link from "next/link";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";
import {AdminModal} from "@/components/admin/admin-modal";
import {AdminFeedback} from "@/components/admin/admin-toast";
import {useAppDialog} from "@/components/app-dialog";
import {ColorPicker} from "@/components/admin/color-picker";
import {SizeMultiSelect} from "@/components/admin/size-multi-select";
import {visualColor} from "@/lib/product-colors";
type Variant={id:string;sku:string;color:string;size:string;price_vnd:number;active:boolean;on_hand:number;reserved:number;available:number;low_stock_threshold:number;color_hex:string;color_group:string};
const blank={sku:"",color:"",color_hex:"",color_group:"",size:"M",sizes:["M"],price_vnd:0,opening_stock:0};
export function VariantManager({productId,onChanged}:{productId:string;onChanged?:()=>void}){
 const {confirm}=useAppDialog();
 const {data,error,loading,reload}=useAdminData<{items:Variant[]}>("admin/products/"+productId+"/variants");
 const [form,setForm]=useState(blank);
 const [adding,setAdding]=useState(false);
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 const [editing,setEditing]=useState<string|null>(null);
 const [draft,setDraft]=useState({color:"",color_hex:"",color_group:"",size:"",price_vnd:0,low_stock_threshold:3});
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setMessage("");
  try{const created=await adminAction("admin/products/"+productId+"/variants","POST",{...form,sku:""});
   setMessage("Đã thêm "+created.variant_ids?.length+" SKU màu "+form.color+" (bắt đầu từ "+created.sku+").");
   setForm(blank);setAdding(false);await reload();onChanged?.();
  }catch(err){setMessage(err instanceof Error?err.message:"Không thêm được size/màu mới.")}
  finally{setBusy(false)}
 }
 function startEdit(v:Variant){
  if(busy)return;
  // A separate editing row prevents a rapid second click on "Edit"
  // from hitting a newly-rendered submit button at the same position.
  setDraft({color:v.color,color_hex:v.color_hex||"",color_group:v.color_group||"",size:v.size,price_vnd:v.price_vnd,low_stock_threshold:v.low_stock_threshold});
  setEditing(v.id);
  setMessage("");
 }
 async function update(v:Variant){
  if(busy||editing!==v.id)return;
  if(!draft.color.trim()||!draft.size.trim()||
    !Number.isSafeInteger(draft.price_vnd)||draft.price_vnd<=0||draft.price_vnd>=1000000000||
    !Number.isSafeInteger(draft.low_stock_threshold)||draft.low_stock_threshold<0||draft.low_stock_threshold>100000){
   setMessage("Màu, size, giá bán hoặc ngưỡng cảnh báo không hợp lệ.");return;
  }
  setBusy(true);setMessage("");
  try{
   await adminAction("admin/variants/"+v.id,"PATCH",{
    ...draft,color:draft.color.trim(),size:draft.size.trim(),active:v.active
   });
   setMessage("Đã cập nhật biến thể "+v.sku+".");
   setEditing(null);await reload();onChanged?.();
  }catch(err){setMessage(err instanceof Error?err.message:"Không thể cập nhật biến thể.")}
  finally{setBusy(false)}
 }
 async function toggle(v:Variant){
  if(!await confirm({title:v.active?"Ngừng bán biến thể?":"Mở bán biến thể?",message:(v.active?"Ngừng bán ":"Mở bán ")+v.sku+"?",confirmLabel:v.active?"Ngừng bán":"Mở bán",cancelLabel:"Hủy",danger:v.active}))return;
  setBusy(true);setMessage("");
  try{await adminAction("admin/variants/"+v.id,"PATCH",{price_vnd:v.price_vnd,active:!v.active});
   setMessage("Đã cập nhật trạng thái "+v.sku+".");await reload();
  }catch(err){setMessage(err instanceof Error?err.message:"Không thay đổi được trạng thái.")}
  finally{setBusy(false)}
 }
 return <section className="admin-variants"><div className="admin-variant-title">
  <h3>Biến thể theo màu và kích thước</h3>
  <div className="admin-row-actions"><button type="button" onClick={()=>setAdding(true)}>+ Thêm size / màu</button><Link href={"/admin/inventory?product="+productId}>Xem kho sản phẩm ↗</Link></div>
 </div>
 <p className="admin-help">Mỗi tổ hợp màu và size chỉ xuất hiện một lần; hệ thống tự cấp mã hàng. Giá và tồn kho được quản lý riêng. Thay đổi số lượng tại Kho hàng.</p>
 <AdminFeedback message={message} error={error}/>
 {loading?<p>Đang tải biến thể...</p>:<div className="admin-table-wrap"><table className="admin-table">
  <thead><tr><th>Mã hàng</th><th>Màu / Size</th><th>Giá bán</th><th>Kho</th><th>Trạng thái / Thao tác</th></tr></thead>
  <tbody>{(data?.items??[]).map(v=><Fragment key={v.id}>
   <tr>
    <td>{v.sku}</td>
    <td><span className="enjoy-variant-color-cell"><span className="enjoy-color-dot" style={{backgroundColor:visualColor(v.color,v.color_hex)??"#ddd"}}/>{v.color} / {v.size}</span></td>
    <td>{moneyVND(v.price_vnd)}</td>
    <td>{v.on_hand} thực tế <small>{v.available} có thể bán · {v.reserved} đã giữ · Cảnh báo ≤ {v.low_stock_threshold}</small></td>
    <td><span className="admin-pill">{v.active?"Đang bán":"Ngừng bán"}</span>
     <div className="admin-row-actions">
      {editing===v.id?<span className="admin-variant-editing-label">Đang chỉnh sửa...</span>
       :<button type="button" disabled={busy} onClick={()=>startEdit(v)}>Chỉnh sửa</button>}
      <button type="button" disabled={busy||editing===v.id} onClick={()=>void toggle(v)}>{v.active?"Ngừng bán":"Mở bán"}</button>
     </div>
    </td>
   </tr>
   {editing===v.id&&<AdminModal title={"Chỉnh sửa biến thể "+v.sku} subtitle="Giá bán, màu, kích thước và mức cảnh báo tồn kho." onClose={()=>!busy&&setEditing(null)} busy={busy}><section className="admin-variant-editor" role="region" aria-label={"Chỉnh sửa biến thể "+v.sku}>
      <div className="admin-variant-editor-head">
       <strong>Chỉnh sửa giá bán & biến thể {v.sku}</strong>
       <small>Chỉnh số lượng kho tại Kho hàng. Các thay đổi bên dưới chưa được lưu.</small>
      </div>
      <div className="admin-variant-editor-fields">
       <div className="admin-wide"><ColorPicker value={{name:draft.color,hex:draft.color_hex,group:draft.color_group}}
         known={[...new Map((data?.items??[]).map(x=>[x.color,{name:x.color,hex:x.color_hex||"",group:x.color_group||"Khác"}])).values()]}
         onChange={color=>setDraft(d=>({...d,color:color.name,color_hex:color.hex,color_group:color.group}))}/></div>
       <label>Size<input maxLength={20} value={draft.size}
        onChange={e=>setDraft(d=>({...d,size:e.target.value}))}/></label>
       <label>Giá bán (VND)<input type="number" min={1} max={999999999} step={1}
        value={draft.price_vnd} onChange={e=>setDraft(d=>({...d,price_vnd:Number(e.target.value)}))}/></label>
       <label>Cảnh báo khi còn ≤<input type="number" min={0} max={100000} step={1}
        value={draft.low_stock_threshold} onChange={e=>setDraft(d=>({...d,low_stock_threshold:Number(e.target.value)}))}/></label>
      </div>
      <div className="admin-variant-editor-actions">
       <button type="button" className="button-dark" disabled={busy} onClick={()=>void update(v)}>
        {busy?"ĐANG LƯU...":"LƯU THAY ĐỔI"}
       </button>
       <button type="button" disabled={busy} onClick={()=>setEditing(null)}>Hủy chỉnh sửa</button>
      </div>
     </section></AdminModal>}
  </Fragment>)}</tbody></table></div>}
 {adding&&<AdminModal title="Thêm màu / size mới" subtitle="Tạo biến thể và mã hàng tự động cho sản phẩm." onClose={()=>!busy&&setAdding(false)} busy={busy}><form onSubmit={create} className="admin-variant-add">
  <h3>Thêm size / màu mới</h3>
  <div className="admin-form-grid">
   <div className="admin-wide"><ColorPicker value={{name:form.color,hex:form.color_hex,group:form.color_group}}
     known={[...new Map((data?.items??[]).map(x=>[x.color,{name:x.color,hex:x.color_hex||"",group:x.color_group||"Khác"}])).values()]}
     onChange={v=>setForm(old=>({...old,color:v.name,color_hex:v.hex,color_group:v.group}))}/></div>
   <div className="admin-wide"><SizeMultiSelect value={form.sizes} onChange={sizes=>setForm(old=>({...old,sizes,size:sizes[0]??""}))}/></div>
   <label>Giá bán (VND)<input type="number" required min={1} max={999999999} value={form.price_vnd||""} onChange={e=>setForm({...form,price_vnd:Number(e.target.value)})}/></label>
   <label>Tồn kho khởi tạo<input type="number" min={0} max={100000} step={1} required value={form.opening_stock} onChange={e=>setForm({...form,opening_stock:Number(e.target.value)})}/></label>
  </div>
  <button className="button-dark" disabled={busy||!form.color.trim()||!form.sizes.length} type="submit">{busy?"ĐANG LƯU...":"+ THÊM SIZE / MÀU"}</button>
 </form></AdminModal>}
 </section>;
}
