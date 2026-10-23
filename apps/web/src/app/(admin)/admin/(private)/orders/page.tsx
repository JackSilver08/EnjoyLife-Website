"use client";
import {useState} from "react";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";
import {useAdminRole} from "@/components/admin/admin-shell";
import {AdminFeedback,useAdminToast} from "@/components/admin/admin-toast";

type Order={order_no:string;customer_name:string;phone?:string;shipping_address?:string;status:string;payment_status:string;payment_method?:string;total_vnd:number;created_at:string};
type RowResult={ok:boolean;message:string};
const transitions:Record<string,string[]>={
 PENDING_CONFIRMATION:["CONFIRMED","CANCELLED"],
 CONFIRMED:["PREPARING","CANCELLED"],
 PREPARING:["SHIPPING","CANCELLED"],
 SHIPPING:["DELIVERED"],
 DELIVERED:["COMPLETED"],
};
const status:Record<string,string>={
 PENDING_CONFIRMATION:"Chờ xác nhận",CONFIRMED:"Đã xác nhận",
 PREPARING:"Đang chuẩn bị",SHIPPING:"Đang giao",
 DELIVERED:"Đã giao",COMPLETED:"Hoàn tất",CANCELLED:"Đã hủy",RETURNED:"Hàng hoàn về"
};
const paymentLabel:Record<string,string>={PAID:"Đã thu tiền",UNPAID:"Chưa thu tiền",REVIEW_REQUIRED:"Cần đối soát"};
function nextStates(order:Order):string[]{
 const options=transitions[order.status]??[];
 if(order.payment_method==="PAYOS"){
  // Paid payOS funds must never be automatically refunded via an order action.
  return order.payment_status==="PAID"?options.filter(s=>s!=="CANCELLED"):[];
 }
 return options;
}
export default function OrdersPage(){
 const role=useAdminRole();
 const notify=useAdminToast();
 const {data,loading,error,reload}=useAdminData<{items:Order[]}>("admin/orders");
 const [filter,setFilter]=useState("ALL");
 const [working,setWorking]=useState("");
 const [selected,setSelected]=useState<Record<string,string>>({});
 const [feedback,setFeedback]=useState<Record<string,RowResult>>({});
 const orders=(data?.items??[]).filter(o=>filter==="ALL"||o.status===filter);

 async function change(order:Order,next:string){
  if(!nextStates(order).includes(next)){
   setFeedback(f=>({...f,[order.order_no]:{ok:false,message:"Không thể chuyển tới trạng thái này. Hãy làm theo từng bước xử lý đơn."}}));return;
  }
  if(next==="CANCELLED"&&!window.confirm("Hủy đơn "+order.order_no+" và trả lại số lượng đã giữ chỗ?"))return;
  setWorking(order.order_no);
  setFeedback(f=>({...f,[order.order_no]:{ok:true,message:"Đang cập nhật..."}}));
  try{
   await adminAction("admin/orders/"+order.order_no+"/status","PATCH",{status:next});
   await reload();
   setSelected(v=>({...v,[order.order_no]:""}));
   notify(order.order_no+" đã chuyển sang: "+(status[next]??next),"success");
  }catch(e){
   const message=e instanceof Error?e.message:"Không thể cập nhật đơn hàng.";
   notify(message,"error");
  }finally{setWorking("")}
 }
 async function paid(order:Order){
  if(!window.confirm("Xác nhận đã thu đủ COD cho đơn "+order.order_no+"?"))return;
  setWorking(order.order_no);
  try{
   await adminAction("admin/orders/"+order.order_no+"/paid","POST");
   await reload();
   notify("Đã ghi nhận thu tiền COD cho "+order.order_no,"success");
  }catch(e){notify(e instanceof Error?e.message:"Lỗi máy chủ.","error")}
  finally{setWorking("")}
 }
 return <><span className="eyebrow">QUẢN LÝ / ĐƠN HÀNG</span><h1>Quản lý đơn hàng</h1>
 <p className="admin-subtitle">Chọn trạng thái kế tiếp cho từng đơn rồi nhấn Cập nhật. Đơn payOS chỉ được xử lý sau khi xác nhận thanh toán.</p>
 <div className="admin-toolbar"><label>Trạng thái <select value={filter} onChange={e=>setFilter(e.target.value)}>
  <option value="ALL">Tất cả</option>{Object.entries(status).map(([k,v])=><option value={k} key={k}>{v}</option>)}
 </select></label><button type="button" onClick={()=>void reload()}>Làm mới</button></div>
 <AdminFeedback error={error}/>
 <section className="admin-surface">{loading?<p>Đang tải...</p>:!orders.length?<p className="admin-empty">Chưa có đơn trong nhóm này.</p>:
 <div className="admin-table-wrap"><table className="admin-table">
 <thead><tr><th>Đơn / Ngày</th><th>Khách</th><th>Giá trị</th><th>Thanh toán</th><th>Trạng thái / Thao tác</th></tr></thead>
 <tbody>{orders.map(o=>{
  const options=nextStates(o);
  const busy=working===o.order_no;
  const note=feedback[o.order_no];
  return <tr key={o.order_no}>
   <td><strong>{o.order_no}</strong><small>{new Date(o.created_at).toLocaleString("vi-VN")}</small></td>
   <td>{o.customer_name}{o.phone&&<small>{o.phone}</small>}{o.shipping_address&&<small>{o.shipping_address}</small>}</td>
   <td>{moneyVND(o.total_vnd)}</td>
   <td><span className="admin-pill">{paymentLabel[o.payment_status]??o.payment_status}</span>
    <small>{o.payment_method??"COD"}</small>
    {o.payment_status==="REVIEW_REQUIRED"&&<small role="alert">Cần đối soát tại payOS trước khi xử lý/hoàn tiền.</small>}
   </td>
   <td><strong>{status[o.status]??o.status}</strong>
    {options.length>0?<div className="order-status-actions">
     <label className="order-status-label" htmlFor={"order-next-"+o.order_no}>Trạng thái tiếp theo</label>
     <select id={"order-next-"+o.order_no} className="order-status-select"
      value={selected[o.order_no]??""}
      disabled={busy}
      onChange={e=>setSelected(v=>({...v,[o.order_no]:e.target.value}))}>
      <option value="">Chọn trạng thái...</option>
      {options.map(next=><option value={next} key={next}>{status[next]}</option>)}
     </select>
     <button type="button" disabled={busy||!options.includes(selected[o.order_no]??"")}
      onClick={()=>void change(o,selected[o.order_no]??"")}>
      {busy?"Đang xử lý...":"Cập nhật"}
     </button>
    </div>:o.payment_method==="PAYOS"&&o.payment_status!=="PAID"?
    <small className="order-status-guidance">Chờ payOS xác nhận. Không thể chuyển trạng thái bằng tay.</small>:
    <small className="order-status-guidance">Đơn không còn bước xử lý tiếp theo.</small>}
    {role==="ADMIN"&&o.payment_method==="COD"&&o.payment_status==="UNPAID"&&["DELIVERED","COMPLETED"].includes(o.status)&&
     <button type="button" className="order-cod-paid" disabled={busy} onClick={()=>void paid(o)}>Xác nhận đã thu COD</button>}
    {note&&<p role={note.ok?"status":"alert"} className={note.ok?"order-status-feedback order-status-ok":"order-status-feedback order-status-error"}>{note.message}</p>}
   </td>
  </tr>})}</tbody></table></div>}</section></>;
}
