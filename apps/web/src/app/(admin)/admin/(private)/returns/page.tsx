"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {AdminModal} from "@/components/admin/admin-modal";
import {AdminFeedback,useAdminToast} from "@/components/admin/admin-toast";
import {adminAction,moneyVND,useAdminData} from "@/components/admin/admin-data";
type ReturnCase={id:string;rma_no:string;order_no:string;kind:"CUSTOMER_RETURN"|"DELIVERY_FAILED";status:string;refund_status:string;refund_amount_vnd:number;reason:string;created_at:string};
type SaleLine={order_item_id:number;sku:string;name:string;color:string;size:string;quantity:number;returnable:number;unit_price_vnd:number};
type ReturnedLine={id:string;order_item_id:number;sku:string;name:string;color:string;size:string;quantity:number;good_received:number;quarantined_received:number;unit_price_vnd:number};
type ReturnDetail=ReturnCase&{items:ReturnedLine[];decision_note:string;received_note:string;refund_reference:string};
const state:Record<string,string>={
 REQUESTED:"Chờ duyệt",APPROVED:"Đã duyệt",REJECTED:"Từ chối",
 RECEIVED:"Đã nhận hàng, chờ hoàn tiền",CLOSED:"Đã đóng"
};
const kindLabel:Record<string,string>={CUSTOMER_RETURN:"Khách đổi/trả",DELIVERY_FAILED:"Giao thất bại"};
export default function AdminReturns(){
 const {data,loading,error,reload}=useAdminData<{items:ReturnCase[]}>("admin/returns");
 const notice=useAdminToast();
 const [creating,setCreating]=useState(false);
 const [orderNo,setOrderNo]=useState("");
 const [kind,setKind]=useState<"CUSTOMER_RETURN"|"DELIVERY_FAILED">("CUSTOMER_RETURN");
 const [reason,setReason]=useState("");
 const [lookup,setLookup]=useState<SaleLine[]>([]);
 const [lookupState,setLookupState]=useState("");
 const [selectedQty,setSelectedQty]=useState<Record<number,number>>({});
 const [detailID,setDetailID]=useState("");
 const [detail,setDetail]=useState<ReturnDetail|null>(null);
 const [decisionNote,setDecisionNote]=useState("");
 const [receiveNote,setReceiveNote]=useState("");
 const [qc,setQc]=useState<Record<string,{good:string;quarantined:string}>>({});
 const [refundReference,setRefundReference]=useState("");
 const [busy,setBusy]=useState(false);
 const receiptKey=useRef("");
 const [filter,setFilter]=useState("ALL");
 const items=(data?.items??[]).filter(x=>filter==="ALL"||x.status===filter);

 useEffect(()=>{
  if(!detailID)return;
  let active=true;
  fetch("/api/store/admin/returns/"+detailID,{cache:"no-store"})
   .then(async response=>{const payload=await response.json();if(!response.ok)throw Error(payload.error||"Không tải được phiếu");if(active){setDetail(payload);setQc({});setDecisionNote("");setRefundReference("");setReceiveNote("")}})
   .catch(err=>{if(active)notice(err instanceof Error?err.message:"Không tải được phiếu.","error")});
  return()=>{active=false};
 },[detailID,notice]);

 async function findOrder(){
  setLookup([]);setSelectedQty({});setLookupState("Đang kiểm tra đơn...");
  try{
   if(!/^EL-[A-F0-9]{8}$/.test(orderNo.trim().toUpperCase()))throw Error("Nhập mã đơn dạng EL-XXXXXXXX.");
   const response=await fetch("/api/store/admin/orders/"+encodeURIComponent(orderNo.trim().toUpperCase())+"/returnable",{cache:"no-store"});
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||"Không tìm thấy đơn");
   setLookup(payload.items??[]);
   setLookupState(payload.items?.length?"Chọn SKU cần trả và số lượng.":"Đơn chưa có sản phẩm.");
  }catch(e){setLookupState(e instanceof Error?e.message:"Không kiểm tra được đơn.")}
 }
 async function create(e:FormEvent){
  e.preventDefault();
  const lines=lookup.filter(item=>(selectedQty[item.order_item_id]??0)>0).map(item=>({order_item_id:item.order_item_id,quantity:selectedQty[item.order_item_id]}));
  if(!lines.length){notice("Chọn ít nhất một biến thể để trả.","error");return}
  if(kind==="DELIVERY_FAILED"&&lines.some((x)=>lookup.find(y=>y.order_item_id===x.order_item_id)?.quantity!==x.quantity)){notice("Giao thất bại cần ghi nhận đủ số lượng từng SKU.","error");return}
  setBusy(true);
  try{
   const result=await adminAction("admin/returns","POST",{order_no:orderNo.trim().toUpperCase(),kind,reason,items:lines});
   setCreating(false);setLookup([]);setSelectedQty({});setReason("");setOrderNo("");
   await reload();setDetailID(result.id);
   notice("Đã lập phiếu "+result.rma_no+". Chưa cộng kho hoặc hoàn tiền.","success");
  }catch(e){notice(e instanceof Error?e.message:"Không lập được phiếu RMA.","error")}
  finally{setBusy(false)}
 }
 async function decide(action:"APPROVE"|"REJECT"){
  if(!detail||decisionNote.trim().length<6){notice("Cần ghi lý do quyết định từ 6 ký tự.","error");return}
  setBusy(true);
  try{
   await adminAction("admin/returns/"+detail.id+"/decision","POST",{action,note:decisionNote});
   notice(action==="APPROVE"?"Đã duyệt phiếu trả hàng.":"Đã từ chối phiếu trả hàng.","success");
   setDetailID("");await reload();
  }catch(e){notice(e instanceof Error?e.message:"Không cập nhật được RMA.","error")}
  finally{setBusy(false)}
 }
 async function receive(){
  if(!detail)return;
  const lines=detail.items.map(i=>({item_id:i.id,good:Number(qc[i.id]?.good||0),quarantined:Number(qc[i.id]?.quarantined||0)}));
  if(lines.some((x,i)=>!Number.isSafeInteger(x.good)||!Number.isSafeInteger(x.quarantined)||x.good<0||x.quarantined<0||x.good+x.quarantined!==detail.items[i].quantity)){
   notice("Mỗi SKU phải được phân loại đủ số lượng: đạt + cách ly = số trả.","error");return;
  }
  // Reuse the key after uncertain transport errors; retries cannot credit stock twice.
  if(!receiptKey.current)receiptKey.current=crypto.randomUUID();
  setBusy(true);
  try{
   const result=await adminAction("admin/returns/"+detail.id+"/receive","POST",{
    request_key:receiptKey.current,note:receiveNote,lines
   });
   receiptKey.current="";
   notice(result.idempotent?"Lần nhận trước đã được ghi nhận, tồn không cộng thêm.":"Đã nhập hàng hoàn và phân loại đạt/cách ly.","success");
   setDetailID("");await reload();
  }catch(e){notice(e instanceof Error?e.message:"Không nhận được hàng.","error")}
  finally{setBusy(false)}
 }
 async function confirmRefund(){
  if(!detail||refundReference.trim().length<8)return;
  if(!window.confirm("Bạn đã thực sự chuyển hoàn "+moneyVND(detail.refund_amount_vnd)+" bên ngoài hệ thống và có mã đối soát chưa?"))return;
  setBusy(true);
  try{
   await adminAction("admin/returns/"+detail.id+"/refund","POST",{reference:refundReference.trim(),amount_vnd:detail.refund_amount_vnd});
   notice("Đã ghi nhận giao dịch hoàn tiền bên ngoài. Không phát sinh chuyển tiền tự động.","success");
   setDetailID("");await reload();
  }catch(e){notice(e instanceof Error?e.message:"Không xác nhận được hoàn tiền.","error")}
  finally{setBusy(false)}
 }
 function closeDetail(){if(!busy){setDetailID("");setDetail(null);receiptKey.current=""}}
 return <><span className="eyebrow">SPRINT 11 / RETURNS & REFUNDS</span>
 <h1>Đổi trả & hoàn tiền</h1>
 <p className="admin-subtitle">Phiếu RMA cho đơn đã giao và giao thất bại. Hàng chỉ được cộng tồn khi nhận thực tế; tiền chỉ được ghi nhận hoàn sau khi đã chuyển và đối soát bên ngoài.</p>
 <div className="admin-toolbar">
  <button className="button-dark" type="button" onClick={()=>setCreating(true)}>+ Tạo phiếu RMA</button>
  <button type="button" onClick={()=>void reload()}>Làm mới</button>
  <Link href="/admin/orders">Quản lý đơn hàng ↗</Link>
  <label>Trạng thái <select value={filter} onChange={e=>setFilter(e.target.value)}>
   <option value="ALL">Tất cả</option>{Object.entries(state).map(([k,v])=><option key={k} value={k}>{v}</option>)}
  </select></label>
 </div>
 <AdminFeedback error={error}/>
 <section className="admin-surface">{loading?<p>Đang tải phiếu RMA...</p>:!items.length?<p className="admin-empty">Chưa có phiếu đổi trả trong nhóm này.</p>:
 <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã RMA / Đơn</th><th>Loại / Lý do</th><th>Số tiền hàng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
 <tbody>{items.map(x=><tr key={x.id}>
  <td><strong>{x.rma_no}</strong><small>{x.order_no} · {new Date(x.created_at).toLocaleDateString("vi-VN")}</small></td>
  <td>{kindLabel[x.kind]}<small>{x.reason}</small></td>
  <td>{moneyVND(x.refund_amount_vnd)}<small>{x.refund_status==="PENDING"?"Chờ hoàn tiền":x.refund_status==="CONFIRMED"?"Đã ghi nhận hoàn":"Không cần hoàn tiền"}</small></td>
  <td><span className="admin-pill">{state[x.status]??x.status}</span></td>
  <td><button type="button" onClick={()=>{receiptKey.current="";setDetail(null);setDetailID(x.id)}}>Chi tiết / xử lý</button></td>
 </tr>)}</tbody></table></div>}</section>
 {creating&&<AdminModal title="Lập phiếu đổi trả / giao thất bại" subtitle="Chỉ tạo yêu cầu; chưa làm thay đổi tồn kho, trạng thái thanh toán hoặc chuyển tiền." wide busy={busy} onClose={()=>!busy&&setCreating(false)}>
  <form className="warehouse-form" onSubmit={e=>void create(e)}>
   <label>Mã đơn hàng<input required value={orderNo} onChange={e=>setOrderNo(e.target.value.toUpperCase())} placeholder="EL-XXXXXXXX" maxLength={11}/></label>
   <button type="button" onClick={()=>void findOrder()}>Tra cứu SKU trong đơn</button>
   {lookupState&&<p className="admin-help" role="status">{lookupState}</p>}
   <label>Loại yêu cầu<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}>
    <option value="CUSTOMER_RETURN">Khách yêu cầu đổi/trả (đơn đã giao)</option>
    <option value="DELIVERY_FAILED">Giao thất bại, hàng đang quay về (đơn đang giao)</option>
   </select></label>
   {lookup.length>0&&<div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Sản phẩm / SKU</th><th>Đã bán</th><th>Còn được yêu cầu</th><th>Trả</th></tr></thead>
    <tbody>{lookup.map(i=><tr key={i.order_item_id}>
     <td><strong>{i.name}</strong><small>{i.sku} · {i.color} / {i.size} · {moneyVND(i.unit_price_vnd)}</small></td>
     <td>{i.quantity}</td><td>{i.returnable}</td>
     <td><input aria-label={"Số trả "+i.sku} type="number" min={0} max={i.returnable}
      value={selectedQty[i.order_item_id]??0} onChange={e=>setSelectedQty(p=>({...p,[i.order_item_id]:Number(e.target.value)}))}/></td>
    </tr>)}</tbody></table></div>}
   <label>Lý do trả / giao thất bại<textarea required minLength={8} maxLength={500} rows={3} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Khách đổi size, lỗi đường may, giao không thành công..."/></label>
   <button className="button-dark" type="submit" disabled={busy||!lookup.length||reason.trim().length<8}>Tạo phiếu RMA</button>
  </form>
 </AdminModal>}
 {detailID&&<AdminModal title={detail?"Xử lý "+detail.rma_no:"Chi tiết phiếu RMA"} subtitle="Quy trình: tạo phiếu → duyệt → nhận hàng & QC → đối soát hoàn tiền (nếu đã thu tiền)." onClose={closeDetail} busy={busy} wide>
  {!detail?<p>Đang tải phiếu...</p>:<>
   <p className="admin-subtitle">{kindLabel[detail.kind]} · {detail.order_no} · {state[detail.status]} · {detail.reason}</p>
   <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Sản phẩm</th><th>Số trả</th><th>Đạt</th><th>Cách ly</th></tr></thead>
   <tbody>{detail.items.map(item=><tr key={item.id}>
    <td><strong>{item.name}</strong><small>{item.sku} · {item.color}/{item.size}</small></td>
    <td>{item.quantity}</td>
    <td>{detail.status==="APPROVED"?<input aria-label={"Hàng đạt "+item.sku} type="number" min={0} max={item.quantity} value={qc[item.id]?.good??""} onChange={e=>setQc(p=>({...p,[item.id]:{good:e.target.value,quarantined:p[item.id]?.quarantined??""}}))}/>:item.good_received}</td>
    <td>{detail.status==="APPROVED"?<input aria-label={"Hàng cách ly "+item.sku} type="number" min={0} max={item.quantity} value={qc[item.id]?.quarantined??""} onChange={e=>setQc(p=>({...p,[item.id]:{good:p[item.id]?.good??"",quarantined:e.target.value}}))}/>:item.quarantined_received}</td>
   </tr>)}</tbody></table></div>
   {detail.status==="REQUESTED"&&<div className="warehouse-form">
    <label>Ghi chú xét duyệt<textarea rows={2} minLength={6} maxLength={500} value={decisionNote} onChange={e=>setDecisionNote(e.target.value)}/></label>
    <div className="admin-row-actions"><button className="button-dark" disabled={busy||decisionNote.trim().length<6} onClick={()=>void decide("APPROVE")}>Duyệt trả hàng</button>
     <button disabled={busy||decisionNote.trim().length<6} type="button" onClick={()=>void decide("REJECT")}>Từ chối</button></div>
   </div>}
   {detail.status==="APPROVED"&&<div className="warehouse-form">
    <label>Biên bản kiểm tra hàng trả<textarea rows={2} maxLength={500} value={receiveNote} onChange={e=>setReceiveNote(e.target.value)} placeholder="Tình trạng tem mác, đường may, bao bì..."/></label>
    <p className="admin-help">Chỉ hàng đạt mới trở lại tồn có thể bán. Hàng cách ly cộng vào tồn thực tế nhưng không thể bán cho đến khi QC duyệt.</p>
    <button className="button-dark" type="button" disabled={busy} onClick={()=>void receive()}>Xác nhận đã nhận đủ hàng thực tế</button>
   </div>}
   {detail.refund_status==="PENDING"&&<section className="admin-surface">
    <h3>Đối soát hoàn tiền</h3>
    <p>Số tiền hàng cần hoàn: <strong>{moneyVND(detail.refund_amount_vnd)}</strong></p>
    {detail.status==="RECEIVED"?<div className="warehouse-form">
     <label>Mã tham chiếu giao dịch đã hoàn ngoài hệ thống<input required minLength={8} maxLength={120} value={refundReference} onChange={e=>setRefundReference(e.target.value)} placeholder="Mã giao dịch ngân hàng / mã đối soát"/></label>
     <button className="button-dark" type="button" disabled={busy||refundReference.trim().length<8} onClick={()=>void confirmRefund()}>Tôi đã hoàn tiền thực tế — Ghi nhận đối soát</button>
     <p className="admin-help">Nút này không gọi payOS hoàn tiền. Chỉ nhấn khi đã chuyển tiền và kiểm tra chứng từ.</p>
    </div>:<p className="admin-help">Chưa thể xác nhận đã hoàn tiền cho đến khi nhận hàng thực tế.</p>}
   </section>}
   {detail.refund_status==="CONFIRMED"&&<p className="admin-notice">Đã ghi nhận hoàn tiền ngoài hệ thống. Mã tham chiếu: {detail.refund_reference}</p>}
  </>}
 </AdminModal>}
 </>;
}
