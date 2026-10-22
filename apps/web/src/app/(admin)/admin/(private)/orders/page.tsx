"use client";
import {useState} from "react";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";
import {useAdminRole} from "@/components/admin/admin-shell";
type Order={order_no:string;customer_name:string;phone?:string;shipping_address?:string;status:string;payment_status:string;payment_method?:string;total_vnd:number;created_at:string};
const transitions:Record<string,string[]>={PENDING_CONFIRMATION:["CONFIRMED","CANCELLED"],CONFIRMED:["PREPARING","CANCELLED"],PREPARING:["SHIPPING","CANCELLED"],SHIPPING:["DELIVERED"],DELIVERED:["COMPLETED"]};
const status:Record<string,string>={PENDING_CONFIRMATION:"Chờ xác nhận",CONFIRMED:"Đã xác nhận",PREPARING:"Đang chuẩn bị",SHIPPING:"Đang giao",DELIVERED:"Đã giao",COMPLETED:"Hoàn tất",CANCELLED:"Đã hủy"};
const paymentLabel:Record<string,string>={PAID:"Đã thu tiền",UNPAID:"Chưa thu tiền",REVIEW_REQUIRED:"Cần đối soát"};
export default function OrdersPage(){
 const role=useAdminRole();
 const {data,loading,error,reload}=useAdminData<{items:Order[]}>("admin/orders");
 const [filter,setFilter]=useState("ALL");const [working,setWorking]=useState("");const [feedback,setFeedback]=useState("");
 const orders=(data?.items??[]).filter(o=>filter==="ALL"||o.status===filter);
 async function change(order:Order,next:string){
  if(next==="CANCELLED"&&!window.confirm("Hủy đơn "+order.order_no+" và trả lại số lượng đã giữ chỗ?"))return;
  setWorking(order.order_no);setFeedback("");
  try{await adminAction("admin/orders/"+order.order_no+"/status","PATCH",{status:next});setFeedback("Đã cập nhật "+order.order_no);await reload()}
  catch(e){setFeedback(e instanceof Error?e.message:"Thao tác thất bại.")}
  finally{setWorking("")}
 }
 async function paid(order:Order){
  if(!window.confirm("Xác nhận đã thu đủ COD cho đơn "+order.order_no+"?"))return;
  setWorking(order.order_no);setFeedback("");
  try{await adminAction("admin/orders/"+order.order_no+"/paid","POST");setFeedback("Đã xác nhận thu COD.");await reload()}catch(e){setFeedback(e instanceof Error?e.message:"Lỗi hệ thống.")}finally{setWorking("")}
 }
 return <><span className="eyebrow">VẬN HÀNH / ĐƠN HÀNG</span><h1>Quản lý đơn hàng</h1><p className="admin-subtitle">Xác nhận, chuẩn bị, bàn giao vận chuyển và ghi nhận giao hàng theo đúng quy trình.</p>
 <div className="admin-toolbar"><label>Trạng thái <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">Tất cả</option>{Object.entries(status).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label><button onClick={()=>void reload()}>Làm mới</button></div>
 {feedback&&<p role="status" className="admin-notice">{feedback}</p>}{error&&<p role="alert" className="admin-error">{error}</p>}
 <section className="admin-surface">{loading?<p>Đang tải...</p>:!orders.length?<p className="admin-empty">Chưa có đơn trong nhóm này.</p>:<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Đơn / Ngày</th><th>Khách</th><th>Giá trị</th><th>Thanh toán</th><th>Trạng thái / Thao tác</th></tr></thead><tbody>{orders.map(o=><tr key={o.order_no}>
 <td><strong>{o.order_no}</strong><small>{new Date(o.created_at).toLocaleString("vi-VN")}</small></td>
 <td>{o.customer_name}{o.phone&&<small>{o.phone}</small>}{o.shipping_address&&<small>{o.shipping_address}</small>}</td>
 <td>{moneyVND(o.total_vnd)}</td><td><span className="admin-pill">{paymentLabel[o.payment_status]??o.payment_status}</span><small>{o.payment_method??"COD"}</small>{o.payment_status==="REVIEW_REQUIRED"&&<small role="alert">Kiểm tra giao dịch payOS trên bảng điều khiển trước khi xử lý hoặc hoàn tiền.</small>}</td>
 <td><strong>{status[o.status]??o.status}</strong><div className="admin-row-actions">{(o.payment_method==="PAYOS"?(o.payment_status==="PAID"?(transitions[o.status]??[]).filter(next=>next!=="CANCELLED"):[]):(transitions[o.status]??[])).map(next=><button disabled={working===o.order_no} key={next} onClick={()=>void change(o,next)} className={next==="CANCELLED"?"admin-danger":""}>{status[next]}</button>)}
  {role==="ADMIN"&&o.payment_method==="COD"&&o.payment_status==="UNPAID"&&["DELIVERED","COMPLETED"].includes(o.status)&&<button disabled={working===o.order_no} onClick={()=>void paid(o)}>Xác nhận thu COD</button>}</div></td></tr>)}</tbody></table></div>}</section>
 </>;
}
