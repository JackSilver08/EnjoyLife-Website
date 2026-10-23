"use client";
import {useState} from "react";
import Link from "next/link";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";

type Insight={sku:string;name:string;color:string;size:string;available:number;threshold:number;sold_30d:number;daily_average:number;lead_days_estimate:number;days_cover:number|null;reorder_point:number;suggested_order:number;status:string};
type Waiting={id:string;name:string;color:string;size:string;email:string;status:string;created_at:string};
type Stock={variant_id:string;sku:string;name:string;color:string;size:string;unavailable:number};
const label:Record<string,string>={OUT_OF_STOCK:"Hết hàng",LOW_STOCK:"Sắp hết",NO_SALES_30D:"Chưa bán 30 ngày",NORMAL:"Bình thường"};
export default function WarehouseInsights(){
 const insights=useAdminData<{items:Insight[];method:string}>("admin/warehouse/insights");
 const waiting=useAdminData<{items:Waiting[]}>("admin/warehouse/waitlist");
 const stock=useAdminData<{items:Stock[]}>("admin/inventory");
 const [filter,setFilter]=useState("ATTENTION");
 const [chosen,setChosen]=useState("");
 const [quantity,setQuantity]=useState("");
 const [reason,setReason]=useState("");
 const [action,setAction]=useState("RELEASE");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [aiAnswer,setAIAnswer]=useState("");
 const [aiBusy,setAIBusy]=useState(false);
 async function requestAI(){
  setAIBusy(true);setAIAnswer("");setMessage("");
  try{
   const result=await adminAction("admin/warehouse/ai-review","POST");
   setAIAnswer(result.answer);
  }catch(e){setMessage(e instanceof Error?e.message:"Chưa phân tích được kho.")}
  finally{setAIBusy(false)}
 }
 const entries=(insights.data?.items??[]).filter(item=>filter==="ALL"||(filter==="ATTENTION"?(item.status==="LOW_STOCK"||item.status==="OUT_OF_STOCK"):item.status===filter));
 async function qc(){
  if(!chosen)return;
  if(action==="SCRAP"&&!window.confirm("Xác nhận loại bỏ hàng lỗi khỏi tồn thực tế?"))return;
  setBusy(true);setMessage("");
  try{
   await adminAction("admin/warehouse/qc/"+chosen,"POST",{action,quantity:Number(quantity),reason});
   setMessage("Đã ghi nhận xử lý hàng cách ly.");setQuantity("");setReason("");
   await Promise.all([insights.reload(),stock.reload()])
  }catch(e){setMessage(e instanceof Error?e.message:"Không xử lý được hàng cách ly.")}
  finally{setBusy(false)}
 }
 async function updateWaiting(item:Waiting,state:"CONTACTED"|"CLOSED"){
  setBusy(true);setMessage("");
  try{await adminAction("admin/warehouse/waitlist/"+item.id,"PATCH",{status:state});await waiting.reload();setMessage("Đã cập nhật trạng thái liên hệ khách.")}
  catch(e){setMessage(e instanceof Error?e.message:"Không cập nhật được yêu cầu.")}
  finally{setBusy(false)}
 }
 return <><span className="eyebrow">SPRINT 9 / PHÂN TÍCH KHO</span><h1>Smart Inventory</h1>
 <p className="admin-subtitle">Cảnh báo theo SKU, hàng đang cách ly và nhu cầu khách chờ. Đề xuất nhập hàng dùng số liệu 30 ngày, không phải dự báo AI.</p>
 <div className="admin-toolbar"><button type="button" onClick={()=>{void insights.reload();void waiting.reload();void stock.reload()}}>Làm mới</button><Link href="/admin/warehouse">Phiếu đặt nhập ↗</Link><Link href="/admin/inventory">Tồn theo SKU ↗</Link></div>
 {message&&<p role="status" className="admin-notice">{message}</p>}
 {(insights.error||waiting.error||stock.error)&&<p role="alert" className="admin-error">{insights.error||waiting.error||stock.error}</p>}
 <section className="admin-surface">
  <div className="admin-section-top"><div><h2>AI phân tích tồn kho</h2><p>AI đọc tối đa 25 SKU đã tổng hợp, không đọc email khách và không được nhập/xuất kho.</p></div>
    <button disabled={aiBusy} onClick={()=>void requestAI()}>{aiBusy?"Đang phân tích…":"Phân tích bằng AI"}</button>
  </div>
  {aiAnswer?<div className="warehouse-ai-answer" role="status">{aiAnswer}</div>:<p className="admin-help">Phân tích tham khảo từ số đã xuất 30 ngày; các quyết định nhập hàng cần được quản lý duyệt.</p>}
 </section>
 <section className="admin-surface">
 <div className="admin-section-top"><div><h2>Cảnh báo và đề xuất nhập hàng</h2><p>Đã xuất kho 30 ngày từ sổ kho, không tính giỏ hàng hoặc đơn chưa gửi.</p></div>
  <label>Hiển thị<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ATTENTION">Cần chú ý</option><option value="ALL">Tất cả</option><option value="OUT_OF_STOCK">Hết hàng</option><option value="LOW_STOCK">Sắp hết</option><option value="NO_SALES_30D">Chưa bán 30 ngày</option></select></label>
 </div>
 {insights.loading?<p>Đang tổng hợp...</p>:entries.length===0?<p>Không có SKU trong bộ lọc.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Sản phẩm</th><th>Tồn bán</th><th>Bán 30 ngày</th><th>Ngày đủ bán</th><th>Điểm nhập lại</th><th>Gợi ý</th></tr></thead><tbody>{entries.map(i=><tr key={i.sku}>
  <td><strong>{i.name}</strong><small>{i.sku} · {i.color}/{i.size}</small><small>{label[i.status]||i.status}</small></td>
  <td><strong>{i.available}</strong><small>Ngưỡng: {i.threshold}</small></td>
  <td>{i.sold_30d}<small>{i.daily_average}/ngày</small></td>
  <td>{i.days_cover===null?"Chưa đủ dữ liệu":i.days_cover+" ngày"}</td>
  <td>{i.reorder_point}<small>Giả định giao: {i.lead_days_estimate} ngày</small></td>
  <td><strong>{i.sold_30d===0?"Chưa đề xuất":i.suggested_order>0?"+ "+i.suggested_order+" chiếc":"Chưa cần nhập"}</strong></td>
 </tr>)}</tbody></table></div>}
 <p className="admin-help">Điểm nhập lại = nhu cầu bình quân 30 ngày × thời gian nhập ước tính + tồn an toàn từng SKU. Hàng chưa bán trong 30 ngày không được tự động đề xuất nhập. Đây là chỉ báo hỗ trợ ra quyết định, không phải cam kết sẽ bán được.</p>
 </section>
 <div className="warehouse-grid">
  <section className="admin-surface"><h2>Xử lý hàng cách ly</h2>
   <p className="admin-subtitle">Hàng lỗi/đang kiểm tra nằm trong tồn thực tế nhưng không thể bán. Chỉ nhân viên được ủy quyền phê duyệt bán hoặc loại khỏi kho.</p>
   <div className="warehouse-form">
    <label>SKU đang cách ly<select value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">Chọn SKU</option>{stock.data?.items.filter(s=>s.unavailable>0).map(i=><option key={i.variant_id} value={i.variant_id}>{i.sku} · {i.name} · {i.color}/{i.size} · cách ly {i.unavailable}</option>)}</select></label>
    <label>Xử lý<select value={action} onChange={e=>setAction(e.target.value)}><option value="RELEASE">Đã kiểm tra đạt — chuyển sang có thể bán</option><option value="SCRAP">Hàng hỏng — loại bỏ khỏi kho</option></select></label>
    <label>Số lượng<input type="number" min={1} max={10000} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
    <label>Biên bản và lý do<input required minLength={6} maxLength={300} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <button className="button-dark" disabled={busy||!chosen||!Number.isSafeInteger(Number(quantity))||Number(quantity)<=0||reason.trim().length<6} onClick={()=>void qc()}>Xác nhận xử lý</button>
   </div>
  </section>
  <section className="admin-surface"><h2>Khách chờ hàng</h2>
   <p className="admin-subtitle">Yêu cầu có đồng ý nhận liên hệ cho đúng màu/size. Hiện cửa hàng liên hệ thủ công; chưa có email tự động.</p>
   {waiting.loading?<p>Đang tải...</p>:!waiting.data?.items.length?<p>Chưa có yêu cầu chờ hàng.</p>:<div className="warehouse-waiting-list">{waiting.data.items.map(w=><article key={w.id}><strong>{w.name} · {w.color}/{w.size}</strong><small>{w.email}</small><small>{w.status} · {new Date(w.created_at).toLocaleDateString("vi-VN")}</small>
    {w.status==="WAITING"&&<div className="warehouse-waiting-actions"><button disabled={busy} onClick={()=>void updateWaiting(w,"CONTACTED")}>Đã liên hệ</button><button disabled={busy} onClick={()=>void updateWaiting(w,"CLOSED")}>Đóng yêu cầu</button></div>}
   </article>)}</div>}
  </section>
 </div>
 </>;
}
