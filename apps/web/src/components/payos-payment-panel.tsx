"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import Script from "next/script";
import {ArrowUpRight,CheckCircle2,RefreshCw} from "lucide-react";

type Props={token:string;initialPaymentStatus:string;initialCheckoutURL:string;initialGatewayStatus?:string};
type PayOSConfig={
 RETURN_URL:string;ELEMENT_ID:string;CHECKOUT_URL:string;embedded:boolean;
 onSuccess:(event:unknown)=>void;onCancel:(event:unknown)=>void;onExit:(event:unknown)=>void;
};
type PayOSWindow=Window&{PayOSCheckout?:{usePayOS:(config:PayOSConfig)=>{open:()=>void;exit:()=>void}}};
function officialURL(raw:string):boolean{
 try{const u=new URL(raw);return u.protocol==="https:"&&u.hostname==="pay.payos.vn"&&!u.username&&!u.password&&!u.port}
 catch{return false}
}
export function PayOSPaymentPanel({token,initialPaymentStatus,initialCheckoutURL,initialGatewayStatus}:Props){
 const router=useRouter();
 const [status,setStatus]=useState(initialPaymentStatus);
 const [url,setURL]=useState(initialCheckoutURL);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [cancelled,setCancelled]=useState(false);
 const [review,setReview]=useState(initialPaymentStatus==="REVIEW_REQUIRED"||initialGatewayStatus==="REVIEW_REQUIRED");
 const [sdkReady,setSDKReady]=useState(false);
 const [embedded,setEmbedded]=useState(false);
 const frameID="payos-frame-"+token.slice(0,16);

 async function check(){
  if(status==="PAID"||review||cancelled)return;
  try{
   const res=await fetch("/api/store/orders/"+token+"/payment-status",{cache:"no-store"});
   const data=await res.json();
   if(data.payment_status==="PAID"){setStatus("PAID");setError("");setNotice("Đã xác minh thanh toán thành công qua payOS.");router.refresh();return}
   if(data.order_status==="CANCELLED"){setCancelled(true);setEmbedded(false);setError("");router.refresh();return}
   if(data.payment_status==="REVIEW_REQUIRED"){setReview(true);setEmbedded(false);setError("");router.refresh();return}
   if(!res.ok&&res.status!==503)setError(data.error||"Chưa xác minh được giao dịch.");
  }catch{ /* Network failure is never a successful payment signal. */ }
 }
 useEffect(()=>{if(status==="PAID"||cancelled||review)return;const timer=window.setInterval(()=>{void check()},20000);return()=>window.clearInterval(timer); // eslint-disable-next-line react-hooks/exhaustive-deps
 },[status,token,review,cancelled]);

 async function cancelOrder(){
  if(!window.confirm("Hủy đơn thanh toán QR? Nếu payOS đã nhận tiền, đơn sẽ không thể hủy."))return;
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/store/orders/"+token+"/cancel-payment",{method:"POST"});
   const data=await res.json();
   if(!res.ok)throw Error(data.error||"Không thể hủy giao dịch.");
   setCancelled(true);setEmbedded(false);setNotice("Đơn đã được hủy trên payOS; số hàng đã giữ được trả về kho.");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Chưa hủy được đơn.");}
  finally{setBusy(false)}
 }
 function displayPayment(checkoutURL:string){
  if(!officialURL(checkoutURL))throw Error("Liên kết thanh toán không hợp lệ.");
  const sdk=(window as PayOSWindow).PayOSCheckout;
  if(!sdkReady||!sdk?.usePayOS){
   // If the official SDK is blocked or still loading, use the hosted page.
   window.location.assign(checkoutURL);return;
  }
  try{
   const config:PayOSConfig={
    RETURN_URL:window.location.origin+window.location.pathname,
    ELEMENT_ID:frameID,CHECKOUT_URL:checkoutURL,embedded:true,
    // Callbacks are hints only: never mark an order paid from iframe or redirect data.
    onSuccess:()=>{void check()},
    onCancel:()=>{void check()},
    onExit:()=>setEmbedded(false),
   };
   sdk.usePayOS(config).open();
   setEmbedded(true);
  }catch{
   window.location.assign(checkoutURL);
  }
 }
 async function open(){
  if(busy||status==="PAID"||review||cancelled)return;
  setBusy(true);setError("");setNotice("");
  try{
   let checkoutURL=url;
   if(!checkoutURL){
    const res=await fetch("/api/store/orders/"+token+"/payment-link",{method:"POST"});
    const data=await res.json();
    if(!res.ok)throw Error(data.error||"Chưa tạo được mã QR thanh toán.");
    if(typeof data.checkout_url!=="string")throw Error("payOS chưa trả về liên kết thanh toán.");
    checkoutURL=data.checkout_url;
   }
   if(!officialURL(checkoutURL))throw Error("Liên kết thanh toán không hợp lệ.");
   setURL(checkoutURL);
   displayPayment(checkoutURL);
  }catch(e){setError(e instanceof Error?e.message:"Chưa mở được payOS.");}
  finally{setBusy(false)}
 }
 return <section className="payos-payment-panel" aria-label="Thanh toán payOS">
  {!review&&!cancelled&&status!=="PAID"&&<Script src="https://cdn.payos.vn/payos-checkout/v1/stable/payos-initialize.js" strategy="afterInteractive" onReady={()=>setSDKReady(true)} onError={()=>setSDKReady(false)}/>}
  {review?<div role="alert" className="payos-payment-review"><strong>Giao dịch cần đối soát</strong><p>payOS ghi nhận tình huống thanh toán bất thường hoặc tiền đến sau khi hủy đơn. Vui lòng liên hệ cửa hàng kèm mã đơn; không chuyển khoản thêm và không đặt lại đơn cho tới khi được xác nhận.</p></div>
  :cancelled?<div className="payos-payment-success"><CheckCircle2 size={24}/><strong>Đơn QR đã hủy an toàn.</strong></div>
  :status==="PAID"?<div className="payos-payment-success"><CheckCircle2 size={24}/><div><strong>Đã thanh toán thành công</strong><p>Giao dịch đã được xác nhận từ payOS. Cửa hàng sẽ xử lý đơn của bạn.</p></div></div>
  :<>
   <strong>Thanh toán bằng QR qua payOS</strong>
   <p>Quét VietQR trực tiếp trên giao diện payOS bên dưới bằng ứng dụng ngân hàng. Số tiền phải khớp đơn hàng. Nếu giao diện nhúng không tải được, bạn vẫn có thể mở trang payOS chính thức.</p>
   <div className="payos-payment-actions">
    <button className="button-dark" type="button" onClick={()=>void open()} disabled={busy}>{busy?"ĐANG MỞ...":embedded?"HIỂN THỊ LẠI MÃ QR":"HIỂN THỊ MÃ QR"} <ArrowUpRight size={16}/></button>
    <button className="payos-refresh" type="button" onClick={()=>void check()}><RefreshCw size={15}/> Kiểm tra thanh toán</button>
   </div>
   <div id={frameID} className="payos-embed-frame" aria-label="Giao diện VietQR của payOS"/>
   {embedded&&<p role="status" className="payos-note">Đang hiển thị giao diện thanh toán chính thức của payOS. Thanh toán chỉ thành công sau khi máy chủ xác minh.</p>}
   {url&&<a className="payos-hosted-link" href={officialURL(url)?url:"#"} target="_blank" rel="noopener noreferrer">Mở payOS trên trang riêng <ArrowUpRight size={14}/></a>}
   <button className="payos-cancel" type="button" onClick={()=>void cancelOrder()} disabled={busy}>Hủy giao dịch và đơn hàng</button>
   {notice&&<p role="status" className="payos-note">{notice}</p>}
   {error&&<p role="alert" className="form-error">{error}</p>}
   <small>Đừng tạo lại đơn nếu ngân hàng đang xử lý chuyển khoản. Website không bao giờ xác nhận thanh toán chỉ từ callback trình duyệt.</small>
  </>}
 </section>;
}
