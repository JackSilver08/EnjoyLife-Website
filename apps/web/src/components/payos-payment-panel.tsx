"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowUpRight,CheckCircle2,RefreshCw} from "lucide-react";

type Props={token:string;initialPaymentStatus:string;initialCheckoutURL:string};
export function PayOSPaymentPanel({token,initialPaymentStatus,initialCheckoutURL}:Props){
 const router=useRouter();
 const [status,setStatus]=useState(initialPaymentStatus);
 const [url,setURL]=useState(initialCheckoutURL);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [cancelled,setCancelled]=useState(false);
 async function check(){
   if(status==="PAID")return;
   try{
     const res=await fetch("/api/store/orders/"+token+"/payment-status",{cache:"no-store"});
     const data=await res.json();
     if(data.payment_status==="PAID"){setStatus("PAID");setError("");setNotice("Đã xác minh thanh toán thành công qua payOS.");router.refresh();return}
     if(data.order_status==="CANCELLED"){setCancelled(true);setError("");setNotice("Giao dịch payOS đã kết thúc, đơn hàng đã được hủy và hoàn lại số lượng giữ kho.");router.refresh();return}
     if(!res.ok&&res.status!==503)return;
   }catch{ /* A transient offline state must not be interpreted as a successful payment. */ }
 }
 useEffect(()=>{if(status==="PAID")return;const timer=window.setInterval(()=>{void check()},20000);return()=>window.clearInterval(timer); // eslint-disable-next-line react-hooks/exhaustive-deps
 },[status,token]);
 async function cancelOrder(){
   if(!window.confirm("Hủy đơn thanh toán QR? Nếu payOS đã nhận tiền, đơn sẽ không thể hủy."))return;
   setBusy(true);setError("");
   try{
     const res=await fetch("/api/store/orders/"+token+"/cancel-payment",{method:"POST"});
     const data=await res.json();
     if(!res.ok)throw Error(data.error||"Không thể hủy giao dịch.");
     setCancelled(true);setNotice("Đơn đã được hủy trên payOS; số hàng đã giữ được trả về kho.");router.refresh();
   }catch(err){setError(err instanceof Error?err.message:"Chưa hủy được đơn.");}
   finally{setBusy(false)}
 }
 async function open(){
   setBusy(true);setError("");setNotice("");
   try{
     if(url){const parsed=new URL(url);if(parsed.protocol!=="https:"||parsed.hostname!=="pay.payos.vn")throw Error("Liên kết thanh toán không hợp lệ.");window.location.assign(url);return}
     const res=await fetch("/api/store/orders/"+token+"/payment-link",{method:"POST"});
     const data=await res.json();
     if(!res.ok)throw Error(data.error||"Chưa tạo được mã QR thanh toán.");
     if(typeof data.checkout_url!=="string")throw Error("payOS chưa trả về liên kết thanh toán.");
     const parsed=new URL(data.checkout_url);
     if(parsed.protocol!=="https:"||parsed.hostname!=="pay.payos.vn")throw Error("Liên kết thanh toán không hợp lệ.");
     setURL(data.checkout_url);window.location.assign(data.checkout_url);
   }catch(e){setError(e instanceof Error?e.message:"Chưa mở được payOS.");setBusy(false)}
 }
 return <section className="payos-payment-panel" aria-label="Thanh toán payOS">
  {cancelled?<div className="payos-payment-success"><CheckCircle2 size={24}/><strong>Đơn QR đã hủy an toàn.</strong></div>:status==="PAID"?<div className="payos-payment-success"><CheckCircle2 size={24}/><div><strong>Đã thanh toán thành công</strong><p>Giao dịch đã được xác nhận từ payOS. Cửa hàng sẽ xử lý đơn của bạn.</p></div></div>:
  <>
   <strong>Thanh toán bằng QR qua payOS</strong>
   <p>Đơn của bạn đang <b>chưa thanh toán</b>. Mở trang payOS để quét mã bằng ứng dụng ngân hàng. Không chuyển khoản tới bất kỳ tài khoản nào ngoài thông tin chính thức do payOS hiển thị.</p>
   <div className="payos-payment-actions">
    <button className="button-dark" type="button" onClick={()=>void open()} disabled={busy}>{busy?"ĐANG MỞ...":"MỞ MÃ QR THANH TOÁN"} <ArrowUpRight size={16}/></button>
    <button className="payos-refresh" type="button" onClick={()=>void check()}><RefreshCw size={15}/> Kiểm tra thanh toán</button>
   </div>
   <button className="payos-cancel" type="button" onClick={()=>void cancelOrder()} disabled={busy}>Hủy giao dịch và đơn hàng</button>
   {notice&&<p role="status" className="payos-note">{notice}</p>}
   {error&&<p role="alert" className="form-error">{error}</p>}
   <small>Không đóng đơn hay đặt lại nhiều lần khi ngân hàng đang xử lý thanh toán.</small>
  </>}
 </section>
}
