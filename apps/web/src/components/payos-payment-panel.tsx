"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowUpRight,CheckCircle2,RefreshCw,ShieldCheck} from "lucide-react";
import {PayOSQRCode} from "@/components/payos-qr-code";
import {money} from "@/lib/format";
import {useAppDialog} from "@/components/app-dialog";

type Props={
 token:string;
 initialPaymentStatus:string;
 initialCheckoutURL:string;
 initialQR:string;
 amountVND:number;
 initialGatewayStatus?:string;
};
function officialURL(raw:string):boolean{
 try{
  const u=new URL(raw);
  return u.protocol==="https:"&&u.hostname==="pay.payos.vn"&&!u.username&&!u.password&&!u.port;
 }catch{return false}
}
function validQR(value:string):boolean{
 return value.length>=12&&value.length<=2900&&/^[\x20-\x7E]+$/.test(value);
}
export function PayOSPaymentPanel({token,initialPaymentStatus,initialCheckoutURL,initialQR,amountVND,initialGatewayStatus}:Props){
 const router=useRouter();
 const {confirm}=useAppDialog();
 const [status,setStatus]=useState(initialPaymentStatus);
 const [url,setURL]=useState(officialURL(initialCheckoutURL)?initialCheckoutURL:"");
 const [qr,setQR]=useState(validQR(initialQR)?initialQR:"");
 const [busy,setBusy]=useState(false);
 const [checking,setChecking]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [cancelled,setCancelled]=useState(false);
 const [review,setReview]=useState(initialPaymentStatus==="REVIEW_REQUIRED"||initialGatewayStatus==="REVIEW_REQUIRED");
 const [failed,setFailed]=useState(initialGatewayStatus==="ERROR");

 async function check(){
  if(status==="PAID"||review||failed||cancelled)return;
  setChecking(true);
  try{
   const res=await fetch("/api/store/orders/"+token+"/payment-status",{cache:"no-store"});
   const data=await res.json();
   if(data.payment_status==="PAID"){
    setStatus("PAID");setError("");setNotice("Đã xác minh thanh toán thành công qua payOS.");
    router.refresh();return;
   }
   if(data.order_status==="CANCELLED"){
    setCancelled(true);setError("");router.refresh();return;
   }
   if(data.payment_status==="REVIEW_REQUIRED"){
    setReview(true);setError("");router.refresh();return;
   }
   if(data.gateway_status==="ERROR"){
    setFailed(true);setError("");return;
   }
   if(!res.ok&&res.status!==503)setError(data.error||"Chưa kiểm tra được giao dịch.");
  }catch{/* Browser network failure cannot mark a transfer as paid. */}
  finally{setChecking(false)}
 }
 useEffect(()=>{
  if(status==="PAID"||review||failed||cancelled)return;
  const timer=window.setInterval(()=>{void check()},20000);
  return()=>window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[status,review,failed,cancelled,token]);

 async function cancelOrder(){
  if(!await confirm({title:"Hủy thanh toán QR?",message:"Nếu payOS đã nhận tiền, đơn sẽ không thể hủy.",confirmLabel:"Hủy đơn",cancelLabel:"Giữ đơn",danger:true}))return;
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/store/orders/"+token+"/cancel-payment",{method:"POST"});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"Không thể hủy giao dịch.");
   setCancelled(true);setQR("");setNotice("Đơn đã được hủy trên payOS; số hàng đã giữ được trả về kho.");
   router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Chưa hủy được đơn.");}
  finally{setBusy(false)}
 }
 async function open(){
  if(busy||status==="PAID"||review||cancelled)return;
  setBusy(true);setError("");setNotice("");
  try{
   const res=await fetch("/api/store/orders/"+token+"/payment-link",{method:"POST"});
   const data=await res.json();
   if(!res.ok&&data.gateway_status==="ERROR")setFailed(true);
   if(!res.ok)throw Error(data.error||"Chưa tạo được mã QR thanh toán.");
   if(typeof data.checkout_url!=="string"||!officialURL(data.checkout_url)){
    throw Error("payOS trả về liên kết thanh toán không hợp lệ.");
   }
   setURL(data.checkout_url);
   if(typeof data.qr_code!=="string"||!validQR(data.qr_code)){
    setQR("");
    throw Error("payOS chưa trả dữ liệu VietQR. Hãy mở trang payOS chính thức ở bên dưới.");
   }
   // QR content is used unmodified. Backend owns orderCode and amount verification.
   setQR(data.qr_code);
  }catch(err){
   setError(err instanceof Error?err.message:"Không thể tải mã QR.");
  }finally{setBusy(false)}
 }
 return <section className="payos-payment-panel" aria-label="Thanh toán payOS">
  {failed?<div role="alert" className="payos-payment-review">
    <strong>Chưa tạo được mã thanh toán</strong>
    <p>payOS đã từ chối mã giao dịch này. Bạn có thể hủy đơn để trả hàng về kho, sau đó đặt lại nếu cần.</p>
    <button className="payos-cancel" type="button" onClick={()=>void cancelOrder()} disabled={busy}>Hủy giao dịch và đơn hàng</button>
    {error&&<p role="alert" className="form-error">{error}</p>}
   </div>
  :review?<div role="alert" className="payos-payment-review">
    <strong>Giao dịch cần đối soát</strong>
    <p>payOS ghi nhận tình huống thanh toán bất thường hoặc tiền đến sau khi hủy đơn. Vui lòng liên hệ cửa hàng kèm mã đơn; không chuyển khoản thêm và không đặt lại đơn cho tới khi được xác nhận.</p>
   </div>
  :cancelled?<div className="payos-payment-success"><CheckCircle2 size={24}/><strong>Đơn QR đã hủy an toàn.</strong></div>
  :status==="PAID"?<div className="payos-payment-success"><CheckCircle2 size={24}/><div>
   <strong>Đã thanh toán thành công</strong>
   <p>Giao dịch đã được xác nhận từ payOS. Cửa hàng sẽ xử lý đơn của bạn.</p>
   </div></div>
  :<>
   <div className="payos-qr-heading">
    <div><span className="payos-qr-eyebrow">ENJOY LIFE / THANH TOÁN</span><h2>Quét mã VietQR</h2>
     <p>Mã QR được hiển thị trực tiếp, không có khung cuộn. Mở ứng dụng ngân hàng để quét.</p></div>
    <ShieldCheck size={24} aria-hidden="true"/>
   </div>
   <div className="payos-qr-amount">
    <span>Số tiền thanh toán</span><strong>{money(amountVND)}</strong>
   </div>
   {qr?<div className="payos-qr-display" data-testid="payos-native-qr">
    <div className="payos-qr-paper"><PayOSQRCode value={qr}/></div>
    <p>Đưa mã QR vào khung quét của ứng dụng ngân hàng</p>
    <small>Đối chiếu tên người nhận và số tiền trong ứng dụng trước khi xác nhận.</small>
   </div>:<div className="payos-qr-placeholder">
    <span>Mã thanh toán chưa được hiển thị</span>
    <p>Nhấn nút bên dưới để lấy mã VietQR từ payOS cho đơn hàng này.</p>
   </div>}
   <div className="payos-payment-actions">
    <button className="button-dark" type="button" onClick={()=>void open()} disabled={busy}>
     {busy?"ĐANG TẢI QR…":qr?"TẢI LẠI MÃ QR":"HIỂN THỊ MÃ QR"} <ArrowUpRight size={16}/>
    </button>
    <button className="payos-refresh" type="button" disabled={checking} onClick={()=>void check()}>
     <RefreshCw size={15}/>{checking?" Đang kiểm tra…":" Kiểm tra thanh toán"}
    </button>
   </div>
   {url&&officialURL(url)&&<a className="payos-hosted-link" href={url} target="_blank" rel="noopener noreferrer">
    Mở trang thanh toán chính thức của payOS <ArrowUpRight size={14}/>
   </a>}
   <button className="payos-cancel" type="button" onClick={()=>void cancelOrder()} disabled={busy}>Hủy giao dịch và đơn hàng</button>
   {notice&&<p role="status" className="payos-note">{notice}</p>}
   {error&&<p role="alert" className="form-error">{error}</p>}
   <small className="payos-qr-footnote">Trạng thái đã thanh toán chỉ được xác nhận từ máy chủ payOS. Đừng chuyển khoản thêm nếu ngân hàng còn đang xử lý.</small>
  </>}
 </section>;
}
