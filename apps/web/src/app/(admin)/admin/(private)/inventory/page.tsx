"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {adminAction,useAdminData} from "@/components/admin/admin-data";
import {useAdminRole} from "@/components/admin/admin-shell";
import {AdminModal} from "@/components/admin/admin-modal";
import {AdminFeedback} from "@/components/admin/admin-toast";

type Stock={
 variant_id:string;product_id:string;product_slug:string;
 sku:string;name:string;color:string;size:string;active:boolean;archived:boolean;
 on_hand:number;reserved:number;unavailable:number;available:number;low_stock_threshold:number
};
type Movement={id:number;type:string;on_hand_delta:number;reserved_delta:number;reason:string;order_no:string;created_at:string};
type Action="RECEIVE"|"ISSUE"|"COUNT";
const operations:{value:Action;label:string;help:string}[]=[
 {value:"RECEIVE",label:"Nhập hàng",help:"Cộng thêm số lượng mới vào tồn thực tế."},
 {value:"ISSUE",label:"Xuất hàng",help:"Trừ số lượng thực tế (không trừ hàng đã giữ cho đơn)."},
 {value:"COUNT",label:"Kiểm kê",help:"Nhập tổng số lượng vật lý đã kiểm đếm, không nhập chênh lệch."}
];
function StockHistory({variantId}:{variantId:string}){
 const {data,loading,error,reload}=useAdminData<{items:Movement[]}>("admin/inventory/"+variantId+"/history");
 return <div className="inventory-history">
  <div className="inventory-history-head"><strong>Lịch sử biến động kho</strong><button type="button" onClick={()=>void reload()}>Làm mới lịch sử</button></div>
  {error&&<p role="alert" className="admin-error">{error}</p>}
  {loading?<p>Đang tải...</p>:!(data?.items?.length)?<p>Chưa có phát sinh kho.</p>:<div className="admin-table-wrap"><table className="admin-table">
   <thead><tr><th>Ngày giờ</th><th>Nghiệp vụ</th><th>Thay đổi tồn</th><th>Giữ hàng</th><th>Lý do / Đơn hàng</th></tr></thead>
   <tbody>{data.items.map(e=><tr key={e.id}>
    <td>{new Date(e.created_at).toLocaleString("vi-VN")}</td><td>{e.type}</td>
    <td>{e.on_hand_delta>0?"+":""}{e.on_hand_delta}</td><td>{e.reserved_delta>0?"+":""}{e.reserved_delta}</td>
    <td>{e.reason||e.order_no||"Hệ thống"}</td>
   </tr>)}</tbody></table></div>}
 </div>;
}
export default function Inventory(){
 const role=useAdminRole();
 const {data,error,loading,reload}=useAdminData<{items:Stock[]}>("admin/inventory");
 const [search,setSearch]=useState("");
 const [low,setLow]=useState(false);
 const [showInactive,setShowInactive]=useState(false);
 const [productFilter,setProductFilter]=useState("");
 const [edit,setEdit]=useState<string|null>(null);
 const [history,setHistory]=useState<string|null>(null);
 const [action,setAction]=useState<Action>("RECEIVE");
 const [quantity,setQuantity]=useState("");
 const [reason,setReason]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 useEffect(()=>{
  const id=new URLSearchParams(window.location.search).get("product");
  if(!id||!/^[a-f0-9-]{36}$/.test(id))return;
  const timeout=window.setTimeout(()=>setProductFilter(id),0);
  return()=>window.clearTimeout(timeout);
 },[]);
 const rows=useMemo(()=>(data?.items??[]).filter(x=>
  (!productFilter||x.product_id===productFilter)
  &&(showInactive||(!x.archived&&x.active))
  &&(!low||(!x.archived&&x.active&&x.available<=x.low_stock_threshold))
  &&(x.sku+" "+x.name+" "+x.color+" "+x.size).toLowerCase().includes(search.trim().toLowerCase())
 ),[data,productFilter,showInactive,low,search]);
 const productName=data?.items?.find(x=>x.product_id===productFilter)?.name;
 async function save(e:FormEvent<HTMLFormElement>,item:Stock){
  e.preventDefault();
  const n=Number(quantity);
  if(!Number.isSafeInteger(n)||(action!=="COUNT"&&n<1)||n<0||n>100000){
   setNotice("Nhập số lượng nguyên hợp lệ.");return;
  }
  if(reason.trim().length<6){setNotice("Lý do phải có ít nhất 6 ký tự.");return}
  setBusy(true);setNotice("");
  try{
   const result=await adminAction("admin/inventory/"+item.variant_id,"PATCH",{action,quantity:n,reason});
   setNotice("Đã cập nhật "+item.sku+" · Tồn thực tế: "+result.on_hand+" · Có thể bán: "+result.available);
   setEdit(null);setQuantity("");setReason("");await reload();
  }catch(err){setNotice(err instanceof Error?err.message:"Không thể điều chỉnh kho.")}
  finally{setBusy(false)}
 }
 return <><span className="eyebrow">QUẢN LÝ / TỒN KHO</span>
  <h1>Quản lý kho hàng</h1>
  <p className="admin-subtitle">Tồn kho gắn trực tiếp với từng size/màu của sản phẩm. Mọi lần nhập, xuất và kiểm kê được ghi lịch sử.</p>
  {productFilter&&<div className="admin-inventory-filter"><span>Đang xem kho: <strong>{productName||"Sản phẩm đã chọn"}</strong></span>
   <button type="button" onClick={()=>{setProductFilter("");window.history.replaceState(null,"","/admin/inventory")}}>Xem toàn bộ kho ×</button></div>}
  <div className="admin-toolbar">
   <input aria-label="Tìm kiếm SKU" placeholder="Tìm mã hàng, tên sản phẩm, màu, size..." value={search} onChange={e=>setSearch(e.target.value)}/>
   <label><input type="checkbox" checked={low} onChange={e=>setLow(e.target.checked)}/> Sắp hết (theo SKU)</label>
   <label><input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/> Cả hàng ngừng bán / đã xóa</label>
   <button type="button" onClick={()=>void reload()}>Làm mới</button>
  </div>
  <AdminFeedback message={notice} error={error}/>
  <section className="admin-surface">
   {loading?<p>Đang tải...</p>:rows.length===0?<p className="admin-empty">Không có mã hàng phù hợp. Hãy thử bật hiển thị hàng ngừng bán hoặc xóa bộ lọc.</p>
   :<div className="admin-table-wrap"><table className="admin-table">
    <thead><tr><th>Sản phẩm / Mã hàng</th><th>Màu / Size</th><th>Tồn thực tế</th><th>Đã giữ</th><th>Không khả dụng</th><th>Có thể bán</th><th>Thao tác</th></tr></thead>
    <tbody>{rows.map(x=><tr key={x.variant_id}>
     <td><Link className="inventory-product-link" href={role==="STAFF"?"/admin/catalog":"/admin/products?edit="+x.product_id}><strong>{x.name}</strong></Link>
      <small>{x.sku}</small>{(x.archived||!x.active)&&<small className="admin-low">{x.archived?"Đã chuyển Thùng rác":"Ngừng bán"}</small>}</td>
     <td>{x.color} / {x.size}</td>
     <td>{x.on_hand}</td><td>{x.reserved}</td><td>{x.unavailable}</td>
     <td><strong className={x.available<=x.low_stock_threshold?"admin-low":""}>{x.available}</strong></td>
     <td><div className="inventory-actions">
      <button type="button" disabled={busy} onClick={()=>{setEdit(edit===x.variant_id?null:x.variant_id);setHistory(null);setAction("RECEIVE");setQuantity("");setReason("");setNotice("")}}>
       {edit===x.variant_id?"Đóng thao tác":"Nhập / Xuất"}
      </button>
      <button type="button" disabled={busy} onClick={()=>{setHistory(history===x.variant_id?null:x.variant_id);setEdit(null)}}>{history===x.variant_id?"Đóng lịch sử":"Lịch sử"}</button>
     </div></td>
    </tr>)}</tbody>
   </table></div>}
  </section>
  {edit&&rows.some(r=>r.variant_id===edit)&&<AdminModal title="Nhập / Xuất / Kiểm kê kho" subtitle="Chỉnh tồn theo đúng SKU và lưu lịch sử biến động." onClose={()=>!busy&&setEdit(null)} busy={busy}><section className="admin-surface inventory-edit-panel">
   {(()=>{const item=rows.find(r=>r.variant_id===edit)!;return <>
    <h2>Thao tác kho — {item.name}</h2>
    <p className="admin-help">{item.sku} · {item.color} / {item.size} · Tồn thực tế hiện tại: {item.on_hand}</p>
    <form onSubmit={e=>void save(e,item)} className="inventory-operation-form">
     <fieldset className="inventory-operation-types"><legend>Chọn nghiệp vụ</legend>
      {operations.map(op=><label key={op.value}><input type="radio" checked={action===op.value} onChange={()=>{setAction(op.value);setQuantity("");setNotice("")}}/>
       <strong>{op.label}</strong><small>{op.help}</small></label>)}
     </fieldset>
     <label>{action==="COUNT"?"Tổng số lượng sau kiểm kê":"Số lượng nhập / xuất"}
      <input type="number" required min={action==="COUNT"?0:1} max={action==="COUNT"?100000:10000} step={1} value={quantity} onChange={e=>setQuantity(e.target.value)}/>
     </label>
     <label>Lý do thực hiện
      <input required minLength={6} maxLength={300} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: Nhập thêm từ nhà cung cấp"/>
     </label>
     <button className="button-dark" disabled={busy} type="submit">{busy?"ĐANG LƯU...":"XÁC NHẬN "+operations.find(op=>op.value===action)?.label.toUpperCase()}</button>
    </form>
   </>})()}
  </section></AdminModal>}
  {history&&<AdminModal title="Lịch sử biến động kho" subtitle="Tra cứu tất cả lần thay đổi tồn của SKU này." onClose={()=>setHistory(null)} wide><section className="admin-surface"><StockHistory variantId={history}/></section></AdminModal>}
  <p className="admin-help">Tồn khả dụng = Tồn thực tế − Đã giữ − Không khả dụng. Hàng ngừng bán vẫn còn trong kho vật lý; chỉ sản phẩm đang hoạt động mới được bán. Không thể xuất nhiều hơn phần tồn chưa giữ.</p>
 </>;
}
